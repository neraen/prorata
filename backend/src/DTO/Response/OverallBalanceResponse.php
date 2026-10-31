<?php

namespace App\DTO\Response;

/**
 * Where the couple stands overall: every month aggregated, transfers deducted.
 */
class OverallBalanceResponse
{
    public string $currency = 'EUR';

    /** @var OverallMemberBalanceResponse[] */
    public array $members = [];

    /** What is left to transfer today, or null when the couple is square. */
    public ?SettlementResponse $settlement = null;

    public int $totalCents = 0;
    public int $prorataTotalCents = 0;
    public int $equalTotalCents = 0;
    public int $directTotalCents = 0;
    public int $transfersTotalCents = 0;

    /**
     * Month-by-month detail, most recent first.
     *
     * @var BalanceResponse[]
     */
    public array $months = [];

    public static function create(
        string $currency,
        array $members,
        ?SettlementResponse $settlement,
        array $months
    ): self {
        $dto = new self();
        $dto->currency = $currency;
        $dto->members = $members;
        $dto->settlement = $settlement;
        $dto->months = $months;

        foreach ($months as $month) {
            $dto->totalCents += $month->totalCents;
            $dto->prorataTotalCents += $month->prorataTotalCents;
            $dto->equalTotalCents += $month->equalTotalCents;
            $dto->directTotalCents += $month->directTotalCents;
            $dto->transfersTotalCents += $month->transfersTotalCents;
        }

        return $dto;
    }
}
