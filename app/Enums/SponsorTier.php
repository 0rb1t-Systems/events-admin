<?php

namespace App\Enums;

enum SponsorTier: string
{
    case PLATINUM = 'platinum';
    case GOLD = 'gold';
    case SILVER = 'silver';
    case PARTNER = 'partner';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
