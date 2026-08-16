<?php

namespace App\Support;

/**
 * Event quota rules for subscription packages.
 *
 * IMPORTANT — never treat quota as a single falsy check:
 * - null  => unlimited (can always create events, subject to other rules)
 * - 0     => zero quota (explicitly not allowed to create any events)
 * - >0    => finite cap (can create while events_created < quota)
 *
 * Phase 4 Events MUST call these helpers (or equivalent explicit branches).
 */
final class EventQuota
{
    public static function isUnlimited(?int $quota): bool
    {
        return $quota === null;
    }

    public static function isZeroQuota(?int $quota): bool
    {
        return $quota === 0;
    }

    public static function canCreateEvent(?int $quota, int $eventsCreated): bool
    {
        if (self::isUnlimited($quota)) {
            return true;
        }

        if (self::isZeroQuota($quota)) {
            return false;
        }

        return $eventsCreated < $quota;
    }

    /**
     * @return int|null Remaining slots, or null when unlimited.
     */
    public static function remaining(?int $quota, int $eventsCreated): ?int
    {
        if (self::isUnlimited($quota)) {
            return null;
        }

        return max(0, $quota - $eventsCreated);
    }

    /**
     * Display / API payload helper (does not invent event counts).
     *
     * @return array{quota: int|null, unlimited: bool, zero_quota: bool, events_created: int, can_create_event: bool, remaining: int|null}
     */
    public static function usagePayload(?int $quota, int $eventsCreated = 0): array
    {
        return [
            'quota' => $quota,
            'unlimited' => self::isUnlimited($quota),
            'zero_quota' => self::isZeroQuota($quota),
            'events_created' => $eventsCreated,
            'can_create_event' => self::canCreateEvent($quota, $eventsCreated),
            'remaining' => self::remaining($quota, $eventsCreated),
        ];
    }
}
