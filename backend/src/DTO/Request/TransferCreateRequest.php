<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class TransferCreateRequest
{
    #[Assert\NotBlank(message: 'Sender user ID is required')]
    public int $fromUserId = 0;

    #[Assert\NotBlank(message: 'Recipient user ID is required')]
    public int $toUserId = 0;

    #[Assert\NotBlank(message: 'Amount is required')]
    #[Assert\Positive(message: 'Amount must be positive')]
    public int $amountCents = 0;

    #[Assert\Length(exactly: 3, exactMessage: 'Currency must be 3 characters')]
    public string $currency = 'EUR';

    #[Assert\NotBlank(message: 'Transfer date is required')]
    #[Assert\Date(message: 'Invalid date format (expected YYYY-MM-DD)')]
    public string $transferredAt = '';

    #[Assert\Length(max: 255, maxMessage: 'Note cannot exceed 255 characters')]
    public ?string $note = null;
}
