<?php

namespace App\DTO\Response;

use App\Entity\PersonalExpense;

class PersonalExpenseResponse
{
    public int $id;
    public string $title;
    public string $category;
    public int $amountCents;
    public string $currency;
    public string $recurrence;
    public string $startsOn;
    public ?string $endsOn = null;

    /** Date this expense falls on for the month being looked at. */
    public ?string $occurredOn = null;

    public static function fromEntity(PersonalExpense $expense, ?int $year = null, ?int $month = null): self
    {
        $dto = new self();
        $dto->id = $expense->getId();
        $dto->title = $expense->getTitle();
        $dto->category = $expense->getCategory();
        $dto->amountCents = $expense->getAmountCents();
        $dto->currency = $expense->getCurrency();
        $dto->recurrence = $expense->getRecurrence()->value;
        $dto->startsOn = $expense->getStartsOn()->format('Y-m-d');
        $dto->endsOn = $expense->getEndsOn()?->format('Y-m-d');
        $dto->occurredOn = $year !== null && $month !== null
            ? $expense->occurrenceDate($year, $month)->format('Y-m-d')
            : $expense->getStartsOn()->format('Y-m-d');

        return $dto;
    }
}
