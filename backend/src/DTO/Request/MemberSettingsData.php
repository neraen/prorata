<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class MemberSettingsData
{
    #[Assert\NotBlank(message: 'User ID is required')]
    public int $userId = 0;

    #[Assert\PositiveOrZero(message: 'Income must be positive')]
    public ?int $incomeCents = null;

    #[Assert\Range(min: 0, max: 100, notInRangeMessage: 'Percentage must be between 0 and 100')]
    public ?int $percentage = null;
}