<?php

namespace App\Enums;

/**
 * Denormalized payment mirror on participations.
 *
 * Source of truth: payments table (Phase 6). Phase 6 MUST sync this field
 * (and may set status=paid) when Payment records change — never invent a
 * second write path that contradicts payments.
 */
enum ParticipationPaymentStatus: string
{
    case NOT_REQUIRED = 'not_required';
    case PENDING = 'pending';
    case PAID = 'paid';
    case REFUNDED = 'refunded';
    case FAILED = 'failed';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
