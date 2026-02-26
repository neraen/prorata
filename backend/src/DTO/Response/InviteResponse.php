<?php

namespace App\DTO\Response;

use App\Entity\CoupleInvite;

class InviteResponse
{
    public string $token;
    public string $invitedEmail;
    public string $createdAt;

    public static function fromEntity(CoupleInvite $invite): self
    {
        $dto = new self();
        $dto->token = $invite->getToken();
        $dto->invitedEmail = $invite->getInvitedEmail();
        $dto->createdAt = $invite->getCreatedAt()->format(\DateTimeInterface::ATOM);

        return $dto;
    }
}