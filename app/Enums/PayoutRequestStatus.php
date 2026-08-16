<?php

namespace App\Enums;

enum PayoutRequestStatus: string
{
    case REQUESTED = 'requested';
    case APPROVED = 'approved';
    case PAID = 'paid';
    case REJECTED = 'rejected';

    /** Counts toward "already paid out" (reserved or settled). */
    public static function reducingOutstanding(): array
    {
        return [
            self::REQUESTED->value,
            self::APPROVED->value,
            self::PAID->value,
        ];
    }

    /** Fully settled against collected funds. */
    public static function settled(): array
    {
        return [self::PAID->value];
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
