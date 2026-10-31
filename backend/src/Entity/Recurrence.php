<?php

namespace App\Entity;

/**
 * How often a personal expense comes back.
 */
enum Recurrence: string
{
    /** One-off expense, counted only in the month of its own date. */
    case NONE = 'none';

    /** Comes back every month from startsOn until endsOn (or forever). */
    case MONTHLY = 'monthly';
}
