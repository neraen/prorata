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

    /** Total of the expenses split according to the couple prorata. */
    public int $prorataTotalCents = 0;
    /** Total of the expenses split 50/50. */
    public int $equalTotalCents = 0;
    /** Total of the expenses fully charged to one member. */
    public int $directTotalCents = 0;
    /** Total of the transfers made between members over the period. */
    public int $transfersTotalCents = 0;

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

    public function withTotals(
        int $prorataTotalCents,
        int $equalTotalCents,
        int $directTotalCents,
        int $transfersTotalCents
    ): self {
        $this->prorataTotalCents = $prorataTotalCents;
        $this->equalTotalCents = $equalTotalCents;
        $this->directTotalCents = $directTotalCents;
        $this->transfersTotalCents = $transfersTotalCents;

        return $this;
    }

    public function toArray(): array
    {
        return [
            'year' => $this->year,
            'month' => $this->month,
            'totalCents' => $this->totalCents,
            'currency' => $this->currency,
            'mode' => $this->mode,
            'members' => array_map(fn(MemberBalanceResponse $m) => $m->toArray(), $this->members),
            'settlement' => $this->settlement?->toArray(),
            'isClosed' => $this->isClosed,
            'prorataTotalCents' => $this->prorataTotalCents,
            'equalTotalCents' => $this->equalTotalCents,
            'directTotalCents' => $this->directTotalCents,
            'transfersTotalCents' => $this->transfersTotalCents,
        ];
    }

    /**
     * Rebuilds a balance from a stored snapshot. Snapshots written before the
     * split-mode and transfer fields existed are read as pure prorata months.
     */
    public static function fromArray(array $data, bool $isClosed): self
    {
        $members = [];
        foreach ($data['members'] ?? [] as $member) {
            $members[] = MemberBalanceResponse::fromArray($member);
        }

        $settlement = isset($data['settlement']) && $data['settlement'] !== null
            ? SettlementResponse::create(
                $data['settlement']['fromUserId'],
                $data['settlement']['toUserId'],
                $data['settlement']['amountCents']
            )
            : null;

        $dto = self::create(
            $data['year'],
            $data['month'],
            $data['totalCents'],
            $data['currency'],
            $data['mode'],
            $members,
            $settlement,
            $isClosed
        );

        return $dto->withTotals(
            $data['prorataTotalCents'] ?? $data['totalCents'],
            $data['equalTotalCents'] ?? 0,
            $data['directTotalCents'] ?? 0,
            $data['transfersTotalCents'] ?? 0
        );
    }
}
