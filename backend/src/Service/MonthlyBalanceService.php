<?php

namespace App\Service;

use App\DTO\Response\BalanceResponse;
use App\DTO\Response\MemberBalanceResponse;
use App\DTO\Response\SettlementResponse;
use App\Entity\Couple;
use App\Entity\CoupleMode;
use App\Repository\ExpenseRepository;
use App\Repository\MonthClosureRepository;

class MonthlyBalanceService
{
    public function __construct(
        private ExpenseRepository $expenseRepository,
        private MonthClosureRepository $monthClosureRepository,
        private CoupleContextService $coupleContextService
    ) {}

    public function calculateBalance(Couple $couple, int $year, int $month): BalanceResponse
    {
        // Check if month is closed - return snapshot if so
        $closure = $this->monthClosureRepository->findByMonth($couple, $year, $month);
        if ($closure !== null) {
            $snapshot = $closure->getSnapshotJson();
            return $this->arrayToBalanceResponse($snapshot, true);
        }

        // Get expenses for the month
        $expenses = $this->expenseRepository->findByMonth($couple, $year, $month);

        // Calculate totals
        $totalCents = array_sum(array_map(fn($e) => $e->getAmountCents(), $expenses));
        $currency = $expenses[0]?->getCurrency() ?? 'EUR';

        // Get ordered members
        $members = $this->coupleContextService->getMembers($couple);

        if (count($members) < 2) {
            // Single member - no balance calculation needed
            $memberA = $members[0] ?? null;
            $membersResponse = [];

            if ($memberA) {
                $paidA = array_sum(array_map(
                    fn($e) => $e->getPaidBy()->getId() === $memberA->getUser()->getId() ? $e->getAmountCents() : 0,
                    $expenses
                ));

                $membersResponse[] = MemberBalanceResponse::create(
                    $memberA->getUser()->getId(),
                    $memberA->getUser()->getDisplayName(),
                    1.0,
                    $totalCents,
                    $paidA,
                    0
                );
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
            );
        }

        $memberA = $members[0];
        $memberB = $members[1];

        // Calculate weights based on mode
        [$weightA, $weightB] = $this->calculateWeights($couple, $memberA, $memberB);

        // Calculate targets
        $targetA = (int) round($totalCents * $weightA, 0, PHP_ROUND_HALF_UP);
        $targetB = $totalCents - $targetA; // Avoid drift

        // Calculate paid amounts
        $paidA = array_sum(array_map(
            fn($e) => $e->getPaidBy()->getId() === $memberA->getUser()->getId() ? $e->getAmountCents() : 0,
            $expenses
        ));
        $paidB = $totalCents - $paidA;

        // Calculate deltas
        $deltaA = $paidA - $targetA;
        $deltaB = $paidB - $targetB;

        // Create member responses
        $membersResponse = [
            MemberBalanceResponse::create(
                $memberA->getUser()->getId(),
                $memberA->getUser()->getDisplayName(),
                $weightA,
                $targetA,
                $paidA,
                $deltaA
            ),
            MemberBalanceResponse::create(
                $memberB->getUser()->getId(),
                $memberB->getUser()->getDisplayName(),
                $weightB,
                $targetB,
                $paidB,
                $deltaB
            ),
        ];

        // Calculate settlement
        $settlement = null;
        if ($deltaA > 0) {
            // A overpaid, B owes A
            $settlement = SettlementResponse::create(
                $memberB->getUser()->getId(),
                $memberA->getUser()->getId(),
                $deltaA
            );
        } elseif ($deltaA < 0) {
            // A underpaid, A owes B
            $settlement = SettlementResponse::create(
                $memberA->getUser()->getId(),
                $memberB->getUser()->getId(),
                abs($deltaA)
            );
        }

        return BalanceResponse::create(
            $year,
            $month,
            $totalCents,
            $currency,
            $couple->getMode()->value,
            $membersResponse,
            $settlement,
            false
        );
    }

    /**
     * @return array{float, float} [weightA, weightB]
     */
    private function calculateWeights(Couple $couple, $memberA, $memberB): array
    {
        return match ($couple->getMode()) {
            CoupleMode::EQUAL => [0.5, 0.5],
            CoupleMode::INCOME => $this->calculateIncomeWeights($memberA, $memberB),
            CoupleMode::PERCENTAGE => $this->calculatePercentageWeights($memberA, $memberB),
        };
    }

    /**
     * @return array{float, float}
     */
    private function calculateIncomeWeights($memberA, $memberB): array
    {
        $incomeA = $memberA->getIncomeCents() ?? 0;
        $incomeB = $memberB->getIncomeCents() ?? 0;
        $total = $incomeA + $incomeB;

        if ($total === 0) {
            return [0.5, 0.5];
        }

        $weightA = $incomeA / $total;
        $weightB = 1 - $weightA;

        return [$weightA, $weightB];
    }

    /**
     * @return array{float, float}
     */
    private function calculatePercentageWeights($memberA, $memberB): array
    {
        $pctA = $memberA->getPercentage() ?? 50;
        $pctB = $memberB->getPercentage() ?? 50;

        return [$pctA / 100, $pctB / 100];
    }

    private function arrayToBalanceResponse(array $data, bool $isClosed): BalanceResponse
    {
        $members = [];
        foreach ($data['members'] ?? [] as $m) {
            $members[] = MemberBalanceResponse::create(
                $m['userId'],
                $m['displayName'],
                $m['weight'],
                $m['targetCents'],
                $m['paidCents'],
                $m['deltaCents']
            );
        }

        $settlement = null;
        if (isset($data['settlement']) && $data['settlement'] !== null) {
            $settlement = SettlementResponse::create(
                $data['settlement']['fromUserId'],
                $data['settlement']['toUserId'],
                $data['settlement']['amountCents']
            );
        }

        return BalanceResponse::create(
            $data['year'],
            $data['month'],
            $data['totalCents'],
            $data['currency'],
            $data['mode'],
            $members,
            $settlement,
            $isClosed
        );
    }
}