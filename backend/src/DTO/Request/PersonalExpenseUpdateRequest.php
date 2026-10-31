<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class PersonalExpenseUpdateRequest
{
    #[Assert\Length(max: 255, maxMessage: 'Title cannot exceed 255 characters')]
    public ?string $title = null;

    #[Assert\Length(max: 50, maxMessage: 'Category cannot exceed 50 characters')]
    public ?string $category = null;

    #[Assert\Positive(message: 'Amount must be positive')]
    public ?int $amountCents = null;

    #[Assert\Length(exactly: 3, exactMessage: 'Currency must be 3 characters')]
    public ?string $currency = null;

    #[Assert\Choice(choices: ['none', 'monthly'], message: 'Invalid recurrence')]
    public ?string $recurrence = null;

    #[Assert\Date(message: 'Invalid date format (expected YYYY-MM-DD)')]
    public ?string $startsOn = null;

    /**
     * Pass a date to stop a recurring expense, or the string "null" semantics
     * via clearEndsOn to make it run again indefinitely.
     */
    #[Assert\Date(message: 'Invalid date format (expected YYYY-MM-DD)')]
    public ?string $endsOn = null;

    /** Set to true to remove the end date of a recurring expense. */
    public bool $clearEndsOn = false;
}
