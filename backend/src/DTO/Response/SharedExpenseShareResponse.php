<?php

namespace App\DTO\Response;

use App\Entity\Expense;

/**
 * A shared expense seen from one member's side: the full amount that was spent,
 * and the slice of it this member bears.
 */
class SharedExpenseShareResponse
{
    public int $id;
    public string $title;
    public string $category;
    /** What the couple spent in total on this line. */
    public int $amountCents;
    /** What this member bears out of it. */
    public int $shareCents;
    public string $currency;
    public string $spentAt;
    public string $splitMode;
    public PaidByResponse $paidBy;

    public static function fromEntity(Expense $expense, int $shareCents): self
    {
        $dto = new self();
        $dto->id = $expense->getId();
        $dto->title = $expense->getTitle();
        $dto->category = $expense->getCategory();
        $dto->amountCents = $expense->getAmountCents();
        $dto->shareCents = $shareCents;
        $dto->currency = $expense->getCurrency();
        $dto->spentAt = $expense->getSpentAt()->format('Y-m-d');
        $dto->splitMode = $expense->getSplitMode()->value;
        $dto->paidBy = PaidByResponse::fromEntity($expense->getPaidBy());

        return $dto;
    }
}
