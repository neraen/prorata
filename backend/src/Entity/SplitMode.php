<?php

namespace App\Entity;

/**
 * How a single expense is shared between the two members.
 */
enum SplitMode: string
{
    /** Split according to the couple prorata settings (income / percentage / equal). */
    case PRORATA = 'prorata';

    /** Split 50/50 whatever the couple prorata settings are. */
    case EQUAL = 'equal';

    /** Fully charged to a single member (the `chargedTo` user). */
    case FULL = 'full';
}
