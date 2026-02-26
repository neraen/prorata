<?php

namespace App\DTO\Response;

use App\Entity\Expense;

class ExpenseListResponse
{
    /** @var ExpenseResponse[] */
    public array $items = [];
    public bool $isClosed = false;

    /**
     * @param Expense[] $expenses
     */
    public static function fromEntities(array $expenses, bool $isClosed): self
    {
        $dto = new self();
        $dto->isClosed = $isClosed;

        foreach ($expenses as $expense) {
            $dto->items[] = ExpenseResponse::fromEntity($expense);
        }

        return $dto;
    }
}