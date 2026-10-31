<?php

namespace App\DTO\Response;

/**
 * One month seen from a single person's side.
 *
 * `personalTotalCents` is what this person spent for themselves;
 * `sharedTotalCents` is their share of the couple's expenses. The UI toggle
 * decides which of the two totals, or their sum, is shown.
 */
class PersonalMonthResponse
{
    public int $year;
    public int $month;
    public string $currency = 'EUR';

    /** @var PersonalExpenseResponse[] */
    public array $personal = [];
    /** @var SharedExpenseShareResponse[] */
    public array $shared = [];

    public int $personalTotalCents = 0;
    /** This member's share of the shared expenses; matches the balance target. */
    public int $sharedTotalCents = 0;
    /** personalTotalCents + sharedTotalCents: what the month really costs them. */
    public int $totalCents = 0;

    /** Part of personalTotalCents coming from monthly recurring expenses. */
    public int $recurringTotalCents = 0;

    public static function create(
        int $year,
        int $month,
        string $currency,
        array $personal,
        array $shared,
        int $personalTotalCents,
        int $sharedTotalCents,
        int $recurringTotalCents
    ): self {
        $dto = new self();
        $dto->year = $year;
        $dto->month = $month;
        $dto->currency = $currency;
        $dto->personal = $personal;
        $dto->shared = $shared;
        $dto->personalTotalCents = $personalTotalCents;
        $dto->sharedTotalCents = $sharedTotalCents;
        $dto->totalCents = $personalTotalCents + $sharedTotalCents;
        $dto->recurringTotalCents = $recurringTotalCents;

        return $dto;
    }
}
