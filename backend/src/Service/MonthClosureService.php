<?php

namespace App\Service;

use App\DTO\Response\BalanceResponse;
use App\Entity\Couple;
use App\Entity\MonthClosure;
use App\Repository\MonthClosureRepository;
use Doctrine\ORM\EntityManagerInterface;

class MonthClosureService
{
    public function __construct(
        private MonthClosureRepository $monthClosureRepository,
        private MonthlyBalanceService $monthlyBalanceService,
        private EntityManagerInterface $entityManager
    ) {}

    public function closeMonth(Couple $couple, int $year, int $month): BalanceResponse
    {
        // Check if already closed - return existing snapshot (idempotent)
        $existing = $this->monthClosureRepository->findByMonth($couple, $year, $month);
        if ($existing !== null) {
            return BalanceResponse::fromArray($existing->getSnapshotJson(), true);
        }

        // Calculate balance
        $balance = $this->monthlyBalanceService->calculateBalance($couple, $year, $month);
        $snapshot = $balance->toArray();

        // Create closure
        $closure = new MonthClosure();
        $closure->setCouple($couple);
        $closure->setYear($year);
        $closure->setMonth($month);
        $closure->setSnapshotJson($snapshot);

        $this->entityManager->persist($closure);
        $this->entityManager->flush();

        // Return with isClosed = true
        return BalanceResponse::fromArray($snapshot, true);
    }
}
