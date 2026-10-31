<?php

namespace App\DTO\Response;

use App\Entity\Transfer;

class TransferResponse
{
    public int $id;
    public PaidByResponse $fromUser;
    public PaidByResponse $toUser;
    public int $amountCents;
    public string $currency;
    public string $transferredAt;
    public ?string $note = null;

    public static function fromEntity(Transfer $transfer): self
    {
        $dto = new self();
        $dto->id = $transfer->getId();
        $dto->fromUser = PaidByResponse::fromEntity($transfer->getFromUser());
        $dto->toUser = PaidByResponse::fromEntity($transfer->getToUser());
        $dto->amountCents = $transfer->getAmountCents();
        $dto->currency = $transfer->getCurrency();
        $dto->transferredAt = $transfer->getTransferredAt()->format('Y-m-d');
        $dto->note = $transfer->getNote();

        return $dto;
    }
}
