<?php

namespace App\DTO\Response;

class MemberBalanceResponse
{
    public int $userId;
    public string $displayName;
    public float $weight;
    public int $targetCents;
    public int $paidCents;
    public int $deltaCents;

    public static function create(
        int $userId,
        string $displayName,
        float $weight,
        int $targetCents,
        int $paidCents,
        int $deltaCents
    ): self {
        $dto = new self();
        $dto->userId = $userId;
        $dto->displayName = $displayName;
        $dto->weight = $weight;
        $dto->targetCents = $targetCents;
        $dto->paidCents = $paidCents;
        $dto->deltaCents = $deltaCents;

        return $dto;
    }
}