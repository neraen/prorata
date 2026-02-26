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
            $snapshot = $existing->getSnapshotJson();
            return $this->createBalanceFromSnapshot($snapshot, true);
        }

        // Calculate balance
        $balance = $this->monthlyBalanceService->calculateBalance($couple, $year, $month);

        // Create closure
        $closure = new MonthClosure();
        $closure->setCouple($couple);
        $closure->setYear($year);
        $closure->setMonth($month);
        $closure->setSnapshotJson($balance->toArray());

        $this->entityManager->persist($closure);
        $this->entityManager->flush();

        // Return with isClosed = true
        return BalanceResponse::create(
            $balance->year,
            $balance->month,
            $balance->totalCents,
            $balance->currency,
            $balance->mode,
            $balance->members,
            $balance->settlement,
            true
        );
    }

    private function createBalanceFromSnapshot(array $data, bool $isClosed): BalanceResponse
    {
        $members = [];
        foreach ($data['members'] ?? [] as $m) {
            $members[] = \App\DTO\Response\MemberBalanceResponse::create(
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
            $settlement = \App\DTO\Response\SettlementResponse::create(
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