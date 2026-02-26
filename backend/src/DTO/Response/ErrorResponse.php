<?php

namespace App\DTO\Response;

class ErrorResponse
{
    public string $message;
    public array $errors;

    public static function validation(array $errors): self
    {
        $dto = new self();
        $dto->message = 'Validation failed';
        $dto->errors = $errors;

        return $dto;
    }

    public static function simple(string $message): self
    {
        $dto = new self();
        $dto->message = $message;
        $dto->errors = [];

        return $dto;
    }
}