<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class JoinRequest
{
    #[Assert\NotBlank(message: 'Token is required')]
    public string $token = '';
}