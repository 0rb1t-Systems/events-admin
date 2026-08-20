<?php

namespace App\Enums;

enum SubscriptionSource: string
{
    case ADMIN_ASSIGN = 'admin_assign';
    case SELF_SUBSCRIBE = 'self_subscribe';
    case SELF_UPGRADE = 'self_upgrade';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
