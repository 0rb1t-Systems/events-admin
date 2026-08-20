<?php

namespace App\Enums;

enum SubscriptionOrderAction: string
{
    case SUBSCRIBE = 'subscribe';
    case UPGRADE = 'upgrade';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
