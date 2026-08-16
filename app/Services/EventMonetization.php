<?php

namespace App\Services;

use App\Models\Event;

/**
 * Keeps events.monetized consistent with ticket types.
 *
 * Rule: monetized === true iff the event has at least one non-deleted ticket type
 * with price > 0. Free-only tiers (price = 0) do not make an event monetized.
 *
 * Admin cannot set monetized independently to contradict ticket types —
 * syncMonetized() is the source of truth after ticket-type changes.
 */
final class EventMonetization
{
    public static function hasPaidTicketTypes(Event $event): bool
    {
        return $event->ticketTypes()
            ->where('price', '>', 0)
            ->exists();
    }

    public static function syncMonetized(Event $event): Event
    {
        $shouldBeMonetized = self::hasPaidTicketTypes($event);

        if ((bool) $event->monetized !== $shouldBeMonetized) {
            $event->monetized = $shouldBeMonetized;
            $event->save();
        }

        return $event->fresh();
    }
}
