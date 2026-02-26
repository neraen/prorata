<?php

namespace App\Exception;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class CoupleFullException extends ConflictHttpException
{
    public function __construct()
    {
        parent::__construct('Couple already has 2 members');
    }
}