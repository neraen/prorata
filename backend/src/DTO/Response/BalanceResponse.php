<?php

namespace App\DTO\Response;

class BalanceResponse
{
    public int $year;
    public int $month;
    public int $totalCents;
    public string $currency;
    public string $mode;
    /** @var MemberBalanceResponse[] */
    public array $members = [];
    public ?SettlementResponse $settlement = null;
    public bool $isClosed = false;

    public static function create(
        int $year,
        int $month,
        int $totalCents,
        string $currency,
        string $mode,
        array $members,
        ?SettlementResponse $settlement,
        bool $isClosed = false
    ): self {
        $dto = new self();
        $dto->year = $year;
        $dto->month = $month;
        $dto->totalCents = $totalCents;
        $dto->currency = $currency;
        $dto->mode = $mode;
        $dto->members = $members;
        $dto->settlement = $settlement;
        $dto->isClosed = $isClosed;

        return $dto;
    }

    public function toArray(): array
    {
        return [
            'year' => $this->year,
            'month' => $this->month,
            'totalCents' => $this->totalCents,
            'currency' => $this->currency,
            'mode' => $this->mode,
            'members' => array_map(fn($m) => [
                'userId' => $m->userId,
                'displayName' => $m->displayName,
                'weight' => $m->weight,
                'targetCents' => $m->targetCents,
                'paidCents' => $m->paidCents,
                'deltaCents' => $m->deltaCents,
            ], $this->members),
            'settlement' => $this->settlement ? [
                'fromUserId' => $this->settlement->fromUserId,
                'toUserId' => $this->settlement->toUserId,
                'amountCents' => $this->settlement->amountCents,
            ] : null,
            'isClosed' => $this->isClosed,
        ];
    }
}