<?php

namespace App\Service;

use App\Entity\Couple;
use App\Repository\MonthClosureRepository;

class ClosedMonthGuard
{
    public function __construct(
        private MonthClosureRepository $monthClosureRepository
    ) {}

    public function isClosed(Couple $couple, int $year, int $month): bool
    {
        return $this->monthClosureRepository->isClosed($couple, $year, $month);
    }

    public function assertNotClosed(Couple $couple, int $year, int $month): void
    {
        if ($this->isClosed($couple, $year, $month)) {
            throw new \App\Exception\MonthClosedException($year, $month);
        }
    }
}