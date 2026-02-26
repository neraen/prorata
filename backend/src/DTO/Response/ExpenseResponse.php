<?php

namespace App\DTO\Response;

use App\Entity\Expense;

class ExpenseResponse
{
    public int $id;
    public string $title;
    public string $category;
    public int $amountCents;
    public string $currency;
    public string $spentAt;
    public PaidByResponse $paidBy;

    public static function fromEntity(Expense $expense): self
    {
        $dto = new self();
        $dto->id = $expense->getId();
        $dto->title = $expense->getTitle();
        $dto->category = $expense->getCategory();
        $dto->amountCents = $expense->getAmountCents();
        $dto->currency = $expense->getCurrency();
        $dto->spentAt = $expense->getSpentAt()->format('Y-m-d');
        $dto->paidBy = PaidByResponse::fromEntity($expense->getPaidBy());

        return $dto;
    }
}