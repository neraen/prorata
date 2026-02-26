<?php

namespace App\DTO\Response;

class SettlementResponse
{
    public int $fromUserId;
    public int $toUserId;
    public int $amountCents;

    public static function create(int $fromUserId, int $toUserId, int $amountCents): self
    {
        $dto = new self();
        $dto->fromUserId = $fromUserId;
        $dto->toUserId = $toUserId;
        $dto->amountCents = $amountCents;

        return $dto;
    }
}