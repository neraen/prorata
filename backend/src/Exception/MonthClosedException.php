<?php

namespace App\Exception;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class MonthClosedException extends ConflictHttpException
{
    public function __construct(int $year, int $month)
    {
        parent::__construct(sprintf('Month %d/%d is already closed', $month, $year));
    }
}