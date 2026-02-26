<?php

namespace App\DTO\Response;

use App\Entity\User;

class PaidByResponse
{
    public int $userId;
    public string $displayName;

    public static function fromEntity(User $user): self
    {
        $dto = new self();
        $dto->userId = $user->getId();
        $dto->displayName = $user->getDisplayName();

        return $dto;
    }
}