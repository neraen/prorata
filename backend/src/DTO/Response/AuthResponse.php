<?php

namespace App\DTO\Response;

use App\Entity\User;

class AuthResponse
{
    public int $id;
    public string $email;
    public string $displayName;
    public string $token;

    public static function fromEntity(User $user, string $token): self
    {
        $dto = new self();
        $dto->id = $user->getId();
        $dto->email = $user->getEmail();
        $dto->displayName = $user->getDisplayName();
        $dto->token = $token;

        return $dto;
    }
}