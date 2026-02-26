<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class ExpenseUpdateRequest
{
    #[Assert\Length(max: 255, maxMessage: 'Title cannot exceed 255 characters')]
    public ?string $title = null;

    #[Assert\Length(max: 50, maxMessage: 'Category cannot exceed 50 characters')]
    public ?string $category = null;

    #[Assert\Positive(message: 'Amount must be positive')]
    public ?int $amountCents = null;

    #[Assert\Length(exactly: 3, exactMessage: 'Currency must be 3 characters')]
    public ?string $currency = null;

    #[Assert\Date(message: 'Invalid date format (expected YYYY-MM-DD)')]
    public ?string $spentAt = null;

    public ?int $paidByUserId = null;
}