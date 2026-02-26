<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class InviteRequest
{
    #[Assert\NotBlank(message: 'Email is required')]
    #[Assert\Email(message: 'Invalid email format')]
    public string $email = '';
}