<?php

namespace App\DTO\Response;

class TokenResponse
{
    public function __construct(
        public string $token
    ) {}
}