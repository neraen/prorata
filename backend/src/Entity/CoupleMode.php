<?php

namespace App\Entity;

enum CoupleMode: string
{
    case INCOME = 'income';
    case PERCENTAGE = 'percentage';
    case EQUAL = 'equal';
}