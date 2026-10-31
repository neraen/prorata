<?php

namespace App\Service;

use App\Entity\Couple;
use App\Entity\CoupleMember;
use App\Entity\CoupleMode;

/**
 * Turns the couple settings into the two prorata weights.
 *
 * Single source of truth: both the monthly balance and the per-expense share
 * breakdown read their weights here, so the two can never disagree.
 */
class ProrataWeightCalculator
{
    /**
     * @return array{float, float} [weightA, weightB], in member order
     */
    public function calculate(Couple $couple, CoupleMember $memberA, CoupleMember $memberB): array
    {
        return match ($couple->getMode()) {
            CoupleMode::EQUAL => [0.5, 0.5],
            CoupleMode::INCOME => $this->fromIncomes($memberA, $memberB),
            CoupleMode::PERCENTAGE => $this->fromPercentages($memberA, $memberB),
        };
    }

    /**
     * @return array{float, float}
     */
    private function fromIncomes(CoupleMember $memberA, CoupleMember $memberB): array
    {
        $incomeA = $memberA->getIncomeCents() ?? 0;
        $incomeB = $memberB->getIncomeCents() ?? 0;
        $total = $incomeA + $incomeB;

        if ($total === 0) {
            return [0.5, 0.5];
        }

        $weightA = $incomeA / $total;

        return [$weightA, 1 - $weightA];
    }

    /**
     * @return array{float, float}
     */
    private function fromPercentages(CoupleMember $memberA, CoupleMember $memberB): array
    {
        $pctA = $memberA->getPercentage() ?? 50;
        $pctB = $memberB->getPercentage() ?? 50;

        return [$pctA / 100, $pctB / 100];
    }
}
