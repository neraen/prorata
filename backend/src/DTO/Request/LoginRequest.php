<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class LoginRequest
{
    #[Assert\NotBlank(message: 'Email is required')]
    #[Assert\Email(message: 'Invalid email format')]
    public string $email = '';

    #[Assert\NotBlank(message: 'Password is required')]
    public string $password = '';
}