<?php

namespace App\Enums;

/**
 * Participation lifecycle status.
 *
 * Final list (Phase 6 Payments + Phase 9 Check-in depend on these):
 * - waitlisted  — legacy only; product no longer creates or promotes waitlist rows
 * - joined      — registered (free = confirmed; paid ticket may still be pending)
 * - paid        — payment confirmed (synced from Payment SoT in Phase 6)
 * - checked_in  — attendee checked in (Phase 9)
 * - cancelled   — withdrawn; excluded from unique (user,event) constraint
 *
 * payment_status on the row is a denormalized mirror of the payments table (Phase 6 SoT).
 */
enum ParticipationStatus: string
{
    case WAITLISTED = 'waitlisted';
    case JOINED = 'joined';
    case PAID = 'paid';
    case CHECKED_IN = 'checked_in';
    case CANCELLED = 'cancelled';

    /**
     * Statuses that may occupy a seat. Callers must also filter payment_status:
     * pending/failed JOINED rows do not occupy. Prefer Participation::confirmedSeat().
     */
    public static function seatOccupying(): array
    {
        return [
            self::JOINED->value,
            self::PAID->value,
            self::CHECKED_IN->value,
        ];
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
