<?php

namespace App\Enums;

enum EventMode: string
{
    case IN_PERSON = 'in_person';
    case ONLINE = 'online';
    case HYBRID = 'hybrid';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function requiresOnlineUrl(): bool
    {
        return $this === self::ONLINE || $this === self::HYBRID;
    }
}
