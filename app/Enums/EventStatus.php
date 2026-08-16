<?php

namespace App\Enums;

/**
 * Event lifecycle statuses (ordered workflow).
 * Transitions are enforced by App\Services\EventStatusMachine — not free-text.
 */
enum EventStatus: string
{
    case DRAFT = 'draft';
    case PUBLISHED = 'published';
    case REGISTRATION_OPEN = 'registration_open';
    case SOLD_OUT = 'sold_out';
    case REGISTRATION_CLOSED = 'registration_closed';
    case ONGOING = 'ongoing';
    case COMPLETED = 'completed';
    case CANCELLED = 'cancelled';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
