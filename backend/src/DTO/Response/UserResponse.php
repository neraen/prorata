<?php

namespace App\DTO\Response;

use App\Entity\User;

class UserResponse
{
    public int $id;
    public string $email;
    public string $displayName;

    public static function fromEntity(User $user): self
    {
        $dto = new self();
        $dto->id = $user->getId();
        $dto->email = $user->getEmail();
        $dto->displayName = $user->getDisplayName();

        return $dto;
    }
}