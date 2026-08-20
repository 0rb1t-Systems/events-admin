<?php

namespace App\Enums;

enum PackageStatus: string
{
    case ACTIVE = 'active';
    case ARCHIVED = 'archived';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
