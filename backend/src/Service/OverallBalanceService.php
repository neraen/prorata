<?php

namespace App\Service;

use App\DTO\Response\BalanceResponse;
use App\DTO\Response\OverallBalanceResponse;
use App\DTO\Response\OverallMemberBalanceResponse;
use App\DTO\Response\SettlementResponse;
use App\Entity\Couple;
use App\Repository\ExpenseRepository;
use App\Repository\MonthClosureRepository;
use App\Repository\TransferRepository;

/**
 * Aggregates every recorded month into a single "who owes whom, right now" view.
 *
 * Each month contributes its own delta (paid minus owed) and the transfers made
 * that month; summing them gives the standing position. Three months of paying
 * 100 too much therefore show up as a 300 claim, minus whatever was transferred.
 */
class OverallBalanceService
{
    public function __construct(
        private MonthlyBalanceService $monthlyBalanceService,
        private CoupleContextService $coupleContextService,
        private ExpenseRepository $expenseRepository,
        private TransferRepository $transferRepository,
        private MonthClosureRepository $monthClosureRepository
    ) {}

    public function calculateOverall(Couple $couple): OverallBalanceResponse
    {
        $months = [];
        foreach ($this->listActiveMonths($couple) as $period) {
            $months[] = $this->monthlyBalanceService->calculateBalance($couple, $period['year'], $period['month']);
        }

        // Most recent first, to be displayed as a timeline
        $months = array_reverse($months);

        $aggregates = [];
        foreach ($this->coupleContextService->getMembers($couple) as $member) {
            $aggregates[$member->getUser()->getId()] = OverallMemberBalanceResponse::create(
                $member->getUser()->getId(),
                $member->getUser()->getDisplayName()
            );
        }

        foreach ($months as $month) {
            foreach ($month->members as $memberBalance) {
                // A member who left the couple can still appear in old snapshots
                $aggregates[$memberBalance->userId] ??= OverallMemberBalanceResponse::create(
                    $memberBalance->userId,
                    $memberBalance->displayName
                );

                $aggregates[$memberBalance->userId]->add($memberBalance);
            }
        }

        $members = array_values($aggregates);

        return OverallBalanceResponse::create(
            $this->resolveCurrency($months),
            $members,
            $this->buildSettlement($members),
            $months
        );
    }

    /**
     * Every month carrying an expense, a transfer or a closure.
     *
     * @return array<int, array{year: int, month: int}>
     */
    private function listActiveMonths(Couple $couple): array
    {
        $periods = [];

        $collect = function (int $year, int $month) use (&$periods): void {
            $periods[sprintf('%04d-%02d', $year, $month)] = ['year' => $year, 'month' => $month];
        };

        foreach ($this->expenseRepository->findDistinctMonths($couple) as $period) {
            $collect($period['year'], $period['month']);
        }

        foreach ($this->transferRepository->findDistinctMonths($couple) as $period) {
            $collect($period['year'], $period['month']);
        }

        foreach ($this->monthClosureRepository->findAllByCouple($couple) as $closure) {
            $collect($closure->getYear(), $closure->getMonth());
        }

        ksort($periods);

        return array_values($periods);
    }

    /**
     * @param OverallMemberBalanceResponse[] $members
     */
    private function buildSettlement(array $members): ?SettlementResponse
    {
        if (count($members) < 2) {
            return null;
        }

        [$memberA, $memberB] = $members;

        if ($memberA->netDeltaCents > 0) {
            // A is ahead overall: B owes A
            return SettlementResponse::create($memberB->userId, $memberA->userId, $memberA->netDeltaCents);
        }

        if ($memberA->netDeltaCents < 0) {
            return SettlementResponse::create($memberA->userId, $memberB->userId, abs($memberA->netDeltaCents));
        }

        return null;
    }

    /**
     * @param BalanceResponse[] $months
     */
    private function resolveCurrency(array $months): string
    {
        foreach ($months as $month) {
            if ($month->totalCents > 0) {
                return $month->currency;
            }
        }

        return $months === [] ? 'EUR' : $months[0]->currency;
    }
}
