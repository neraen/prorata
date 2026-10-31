<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class TransferUpdateRequest
{
    public ?int $fromUserId = null;

    public ?int $toUserId = null;

    #[Assert\Positive(message: 'Amount must be positive')]
    public ?int $amountCents = null;

    #[Assert\Length(exactly: 3, exactMessage: 'Currency must be 3 characters')]
    public ?string $currency = null;

    #[Assert\Date(message: 'Invalid date format (expected YYYY-MM-DD)')]
    public ?string $transferredAt = null;

    #[Assert\Length(max: 255, maxMessage: 'Note cannot exceed 255 characters')]
    public ?string $note = null;
}
