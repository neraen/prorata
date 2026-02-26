<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class RegisterRequest
{
    #[Assert\NotBlank(message: 'Email is required')]
    #[Assert\Email(message: 'Invalid email format')]
    public string $email = '';

    #[Assert\NotBlank(message: 'Password is required')]
    #[Assert\Length(min: 8, minMessage: 'Password must be at least 8 characters')]
    public string $password = '';

    #[Assert\NotBlank(message: 'Display name is required')]
    #[Assert\Length(min: 2, minMessage: 'Display name must be at least 2 characters')]
    public string $displayName = '';
}