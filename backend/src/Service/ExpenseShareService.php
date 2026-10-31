<?php

namespace App\Service;

use App\Entity\Couple;
use App\Entity\Expense;
use App\Entity\SplitMode;
use App\Entity\User;

/**
 * Breaks a month's shared expenses down into what one member bears, line by line.
 *
 * The monthly balance rounds once per split group, so a naive per-line rounding
 * would not sum back to it. Each group is therefore allocated cumulatively:
 * a line gets `round(runningTotal * weight)` minus what was already handed out,
 * which makes the lines add up to exactly the group target the balance uses.
 */
class ExpenseShareService
{
    public function __construct(
        private CoupleContextService $coupleContextService,
        private ProrataWeightCalculator $weightCalculator
    ) {}

    /**
     * @param Expense[] $expenses
     *
     * @return array<int, int> share in cents, keyed by expense id
     */
    public function sharesFor(Couple $couple, User $member, array $expenses): array
    {
        $members = $this->coupleContextService->getMembers($couple);

        if (count($members) < 2) {
            // Alone in the couple: everything is on this member
            return $this->allocateWholeAmounts($expenses);
        }

        $isFirstMember = $members[0]->getUser()->getId() === $member->getId();
        [$weightA, $weightB] = $this->weightCalculator->calculate($couple, $members[0], $members[1]);
        $weight = $isFirstMember ? $weightA : $weightB;

        $shares = [];

        // Prorata group: cumulative allocation against the member's weight
        $this->allocateGroup(
            $shares,
            $this->filterBySplitMode($expenses, SplitMode::PRORATA),
            $isFirstMember
                ? fn(int $running): int => (int) round($running * $weight, 0, PHP_ROUND_HALF_UP)
                // B gets the remainder, exactly as the monthly balance computes it
                : fn(int $running): int => $running - (int) round($running * $weightA, 0, PHP_ROUND_HALF_UP)
        );

        // 50/50 group: same idea, with a fixed half
        $this->allocateGroup(
            $shares,
            $this->filterBySplitMode($expenses, SplitMode::EQUAL),
            $isFirstMember
                ? fn(int $running): int => (int) round($running / 2, 0, PHP_ROUND_HALF_UP)
                : fn(int $running): int => $running - (int) round($running / 2, 0, PHP_ROUND_HALF_UP)
        );

        // Fully charged expenses: all or nothing
        foreach ($expenses as $expense) {
            if ($expense->effectiveSplitMode() !== SplitMode::FULL) {
                continue;
            }

            $shares[$expense->getId()] = $expense->getChargedTo()?->getId() === $member->getId()
                ? $expense->getAmountCents()
                : 0;
        }

        return $shares;
    }

    /**
     * @param array<int, int> $shares
     * @param Expense[] $expenses
     * @param callable(int): int $targetAt cumulated share owed once $running has been seen
     */
    private function allocateGroup(array &$shares, array $expenses, callable $targetAt): void
    {
        $running = 0;
        $allocated = 0;

        foreach ($expenses as $expense) {
            $running += $expense->getAmountCents();
            $target = $targetAt($running);
            $shares[$expense->getId()] = $target - $allocated;
            $allocated = $target;
        }
    }

    /**
     * @param Expense[] $expenses
     *
     * @return Expense[]
     */
    private function filterBySplitMode(array $expenses, SplitMode $mode): array
    {
        return array_values(array_filter(
            $expenses,
            fn(Expense $expense) => $expense->effectiveSplitMode() === $mode
        ));
    }

    /**
     * @param Expense[] $expenses
     *
     * @return array<int, int>
     */
    private function allocateWholeAmounts(array $expenses): array
    {
        $shares = [];
        foreach ($expenses as $expense) {
            $shares[$expense->getId()] = $expense->getAmountCents();
        }

        return $shares;
    }
}
