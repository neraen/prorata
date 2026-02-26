<?php

namespace App\DTO\Response;

use App\Entity\CoupleMember;

class MemberResponse
{
    public int $userId;
    public string $displayName;
    public ?int $incomeCents;
    public ?int $percentage;

    public static function fromEntity(CoupleMember $member): self
    {
        $dto = new self();
        $dto->userId = $member->getUser()->getId();
        $dto->displayName = $member->getUser()->getDisplayName();
        $dto->incomeCents = $member->getIncomeCents();
        $dto->percentage = $member->getPercentage();

        return $dto;
    }
}