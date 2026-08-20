<?php

namespace App\Enums;

enum OrganizerStatus: string
{
    case ACTIVE = 'active';
    case SUSPENDED = 'suspended';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
