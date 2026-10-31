<?php

namespace App\Service;

use App\DTO\Response\BalanceResponse;
use App\DTO\Response\MemberBalanceResponse;
use App\DTO\Response\SettlementResponse;
use App\Entity\Couple;
use App\Entity\CoupleMember;
use App\Entity\Expense;
use App\Entity\SplitMode;
use App\Entity\Transfer;
use App\Repository\ExpenseRepository;
use App\Repository\MonthClosureRepository;
use App\Repository\TransferRepository;

class MonthlyBalanceService
{
    public function __construct(
        private ExpenseRepository $expenseRepository,
        private MonthClosureRepository $monthClosureRepository,
        private CoupleContextService $coupleContextService,
        private TransferRepository $transferRepository,
        private ProrataWeightCalculator $weightCalculator
    ) {}

    public function calculateBalance(Couple $couple, int $year, int $month): BalanceResponse
    {
        // Check if month is closed - return snapshot if so
        $closure = $this->monthClosureRepository->findByMonth($couple, $year, $month);
        if ($closure !== null) {
            return BalanceResponse::fromArray($closure->getSnapshotJson(), true);
        }

        // Get expenses and transfers for the month
        $expenses = $this->expenseRepository->findByMonth($couple, $year, $month);
        $transfers = $this->transferRepository->findByMonth($couple, $year, $month);

        // Calculate totals
        $totalCents = array_sum(array_map(fn(Expense $e) => $e->getAmountCents(), $expenses));
        $currency = $expenses === [] ? 'EUR' : $expenses[0]->getCurrency();

        // Get ordered members
        $members = $this->coupleContextService->getMembers($couple);

        if (count($members) < 2) {
            return $this->buildSingleMemberBalance($couple, $year, $month, $expenses, $totalCents, $currency, $members);
        }

        $memberA = $members[0];
        $memberB = $members[1];
        $userIdA = $memberA->getUser()->getId();
        $userIdB = $memberB->getUser()->getId();

        // Calculate weights based on mode
        [$weightA, $weightB] = $this->weightCalculator->calculate($couple, $memberA, $memberB);

        // Split the month total per split mode, so that each group is rounded once
        $prorataCents = $this->sumBySplitMode($expenses, SplitMode::PRORATA);
        $equalCents = $this->sumBySplitMode($expenses, SplitMode::EQUAL);
        $directA = $this->sumChargedTo($expenses, $userIdA);
        $directB = $this->sumChargedTo($expenses, $userIdB);

        $prorataTargetA = (int) round($prorataCents * $weightA, 0, PHP_ROUND_HALF_UP);
        $equalTargetA = (int) round($equalCents / 2, 0, PHP_ROUND_HALF_UP);

        // Targets: B gets the remainder of each group so cents never drift
        $targetA = $prorataTargetA + $equalTargetA + $directA;
        $targetB = $totalCents - $targetA;

        // Calculate paid amounts
        $paidA = array_sum(array_map(
            fn(Expense $e) => $e->getPaidBy()->getId() === $userIdA ? $e->getAmountCents() : 0,
            $expenses
        ));
        $paidB = $totalCents - $paidA;

        // Transfers made during the month
        $sentA = $this->sumTransfersFrom($transfers, $userIdA);
        $sentB = $this->sumTransfersFrom($transfers, $userIdB);

        $membersResponse = [
            MemberBalanceResponse::create($userIdA, $memberA->getUser()->getDisplayName(), $weightA, $targetA, $paidA, $paidA - $targetA)
                ->withBreakdown($prorataTargetA, $equalTargetA, $directA)
                ->withTransfers($sentA, $sentB),
            MemberBalanceResponse::create($userIdB, $memberB->getUser()->getDisplayName(), $weightB, $targetB, $paidB, $paidB - $targetB)
                ->withBreakdown($prorataCents - $prorataTargetA, $equalCents - $equalTargetA, $directB)
                ->withTransfers($sentB, $sentA),
        ];

        // Settlement is what is still owed once transfers are accounted for
        $settlement = $this->buildSettlement($userIdA, $userIdB, $membersResponse[0]->netDeltaCents);

        return BalanceResponse::create(
            $year,
            $month,
            $totalCents,
            $currency,
            $couple->getMode()->value,
            $membersResponse,
            $settlement,
            false
        )->withTotals($prorataCents, $equalCents, $directA + $directB, $sentA + $sentB);
    }

    /**
     * @param Expense[] $expenses
     * @param CoupleMember[] $members
     */
    private function buildSingleMemberBalance(
        Couple $couple,
        int $year,
        int $month,
        array $expenses,
        int $totalCents,
        string $currency,
        array $members
    ): BalanceResponse {
        $memberA = $members[0] ?? null;
        $membersResponse = [];

        if ($memberA !== null) {
            $paidA = array_sum(array_map(
                fn(Expense $e) => $e->getPaidBy()->getId() === $memberA->getUser()->getId() ? $e->getAmountCents() : 0,
                $expenses
            ));

            $membersResponse[] = MemberBalanceResponse::create(
                $memberA->getUser()->getId(),
                $memberA->getUser()->getDisplayName(),
                1.0,
                $totalCents,
                $paidA,
                0
            )->withBreakdown($totalCents, 0, 0);
        }

        return BalanceResponse::create(
            $year,
            $month,
            $totalCents,
            $currency,
            $couple->getMode()->value,
            $membersResponse,
            null,
            false
        )->withTotals($totalCents, 0, 0, 0);
    }

    /**
     * Who still owes whom, given member A's net delta.
     */
    private function buildSettlement(int $userIdA, int $userIdB, int $netDeltaA): ?SettlementResponse
    {
        if ($netDeltaA > 0) {
            // A is ahead: B owes A
            return SettlementResponse::create($userIdB, $userIdA, $netDeltaA);
        }

        if ($netDeltaA < 0) {
            // A is behind: A owes B
            return SettlementResponse::create($userIdA, $userIdB, abs($netDeltaA));
        }

        return null;
    }

    /**
     * @param Expense[] $expenses
     */
    private function sumBySplitMode(array $expenses, SplitMode $mode): int
    {
        return array_sum(array_map(
            fn(Expense $e) => $e->effectiveSplitMode() === $mode ? $e->getAmountCents() : 0,
            $expenses
        ));
    }

    /**
     * @param Expense[] $expenses
     */
    private function sumChargedTo(array $expenses, int $userId): int
    {
        return array_sum(array_map(
            fn(Expense $e) => $e->effectiveSplitMode() === SplitMode::FULL
                && $e->getChargedTo()?->getId() === $userId
                    ? $e->getAmountCents()
                    : 0,
            $expenses
        ));
    }

    /**
     * @param Transfer[] $transfers
     */
    private function sumTransfersFrom(array $transfers, int $userId): int
    {
        return array_sum(array_map(
            fn(Transfer $t) => $t->getFromUser()->getId() === $userId ? $t->getAmountCents() : 0,
            $transfers
        ));
    }

}
