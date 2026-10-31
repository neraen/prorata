<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class PersonalExpenseCreateRequest
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

    #[Assert\Choice(choices: ['none', 'monthly'], message: 'Invalid recurrence')]
    public string $recurrence = 'none';

    /** Date of a one-off expense, or first month of a recurring one. */
    #[Assert\NotBlank(message: 'Start date is required')]
    #[Assert\Date(message: 'Invalid date format (expected YYYY-MM-DD)')]
    public string $startsOn = '';

    /** Optional last month of a recurring expense. */
    #[Assert\Date(message: 'Invalid date format (expected YYYY-MM-DD)')]
    public ?string $endsOn = null;
}
