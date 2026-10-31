<?php

namespace App\DTO\Response;

use App\Entity\Transfer;

class TransferListResponse
{
    /** @var TransferResponse[] */
    public array $items = [];

    /**
     * @param Transfer[] $transfers
     */
    public static function fromEntities(array $transfers): self
    {
        $dto = new self();

        foreach ($transfers as $transfer) {
            $dto->items[] = TransferResponse::fromEntity($transfer);
        }

        return $dto;
    }
}
