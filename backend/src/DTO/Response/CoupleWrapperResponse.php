<?php

namespace App\DTO\Response;

use App\Entity\Couple;

class CoupleWrapperResponse
{
    public ?CoupleResponse $couple = null;

    public static function fromEntity(?Couple $couple): self
    {
        $dto = new self();

        if ($couple !== null) {
            $dto->couple = CoupleResponse::fromEntity($couple);
        }

        return $dto;
    }
}