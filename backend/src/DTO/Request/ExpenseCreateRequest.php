<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class ExpenseCreateRequest
{
    #[Assert\NotBlank(message: 'Title is required')]
    #[Assert\Length(max: 255, maxMessage: 'Title cannot exceed 255 characters')]
    public string $title = '';

    #[Assert\NotBlank(message: 'Category is required')]
    #[Assert\Length(max: 50, maxMessage: 'Category cannot exceed 50 characters')]
    public string $category = '';

    #[Assert\NotBlank(message: 'Amount is required')]
    #[Assert\Positive(message: 'Amount must be positive')]
    public int $amountCents = 0;

    #[Assert\Length(exactly: 3, exactMessage: 'Currency must be 3 characters')]
    public string $currency = 'EUR';

    #[Assert\NotBlank(message: 'Spent date is required')]
    #[Assert\Date(message: 'Invalid date format (expected YYYY-MM-DD)')]
    public string $spentAt = '';

    #[Assert\NotBlank(message: 'Payer user ID is required')]
    public int $paidByUserId = 0;
}