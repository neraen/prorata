<?php

namespace App\DTO\Response;

use App\Entity\Couple;

class CoupleResponse
{
    public int $id;
    public string $mode;
    /** @var MemberResponse[] */
    public array $members = [];

    public static function fromEntity(Couple $couple): self
    {
        $dto = new self();
        $dto->id = $couple->getId();
        $dto->mode = $couple->getMode()->value;

        foreach ($couple->getOrderedMembers() as $member) {
            $dto->members[] = MemberResponse::fromEntity($member);
        }

        return $dto;
    }
}