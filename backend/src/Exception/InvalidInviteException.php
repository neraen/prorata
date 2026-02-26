<?php

namespace App\Exception;

use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class InvalidInviteException extends BadRequestHttpException
{
    public function __construct(string $reason = 'Invalid or expired invite token')
    {
        parent::__construct($reason);
    }
}