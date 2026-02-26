<?php

namespace App\DTO\Response;

use App\Entity\MonthClosure;

class HistoryItemResponse
{
    public int $year;
    public int $month;
    public string $closedAt;
    public int $totalCents;
    public ?SettlementResponse $settlement = null;

    public static function fromEntity(MonthClosure $closure): self
    {
        $dto = new self();
        $dto->year = $closure->getYear();
        $dto->month = $closure->getMonth();
        $dto->closedAt = $closure->getClosedAt()->format(\DateTimeInterface::ATOM);

        $snapshot = $closure->getSnapshotJson();
        $dto->totalCents = $snapshot['totalCents'] ?? 0;

        if (isset($snapshot['settlement']) && $snapshot['settlement'] !== null) {
            $dto->settlement = SettlementResponse::create(
                $snapshot['settlement']['fromUserId'],
                $snapshot['settlement']['toUserId'],
                $snapshot['settlement']['amountCents']
            );
        }

        return $dto;
    }
}