<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class CloseMonthRequest
{
    #[Assert\NotBlank(message: 'Year is required')]
    #[Assert\Range(min: 2000, max: 2100, notInRangeMessage: 'Year must be between 2000 and 2100')]
    public int $year = 0;

    #[Assert\NotBlank(message: 'Month is required')]
    #[Assert\Range(min: 1, max: 12, notInRangeMessage: 'Month must be between 1 and 12')]
    public int $month = 0;
}