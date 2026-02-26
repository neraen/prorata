<?php

namespace App\DTO\Response;

use App\Entity\MonthClosure;

class HistoryListResponse
{
    /** @var HistoryItemResponse[] */
    public array $items = [];

    /**
     * @param MonthClosure[] $closures
     */
    public static function fromEntities(array $closures): self
    {
        $dto = new self();

        foreach ($closures as $closure) {
            $dto->items[] = HistoryItemResponse::fromEntity($closure);
        }

        return $dto;
    }
}