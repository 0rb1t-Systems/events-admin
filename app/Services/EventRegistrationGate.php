<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Models\Event;

/**
 * Registration eligibility — TWO INDEPENDENT GATES (never combine into one condition).
 *
 * Gate A — Capacity: EventRegistrationGate::isCapacityReached()
 *   - capacity === null → unlimited (not reached)
 *   - capacity === 0 → reached (zero seats)
 *   - capacity > 0 → reached when held seats (confirmed + unpaid pending) >= capacity
 *     Failed/cancelled checkouts do not count. Confirmed = free joined, paid, checked-in.
 *   When reached while status is registration_open, EventStatusMachine::syncSoldOutFromCapacity()
 *   transitions to sold_out (independent of deadline).
 *
 * Gate B — Deadline: EventRegistrationGate::isRegistrationDeadlinePassed()
 *   - registration_deadline === null → no deadline gate
 *   - otherwise passed when now() > registration_deadline
 *   Blocks new registrations even if capacity remains and status is still registration_open
 *   (independent of capacity / sold_out).
 *
 * Both gates must pass (plus status must allow registration) for canAcceptRegistration().
 */
final class EventRegistrationGate
{
    /**
     * Gate A — capacity only. Does not inspect deadline.
     *
     * capacity null = unlimited; 0 = no seats; >0 = finite.
     */
    public static function isCapacityReached(Event $event): bool
    {
        $capacity = $event->capacity;

        if ($capacity === null) {
            return false;
        }

        if ($capacity === 0) {
            return true;
        }

        if (! $event->id) {
            return (int) $event->registrations_count >= $capacity;
        }

        return app(ParticipationService::class)->countHeldSeats((int) $event->id) >= $capacity;
    }

    /**
     * Gate B — registration_deadline only. Does not inspect capacity.
     */
    public static function isRegistrationDeadlinePassed(Event $event, $now = null): bool
    {
        if ($event->registration_deadline === null) {
            return false;
        }

        $now = $now ?? now();

        return $event->registration_deadline->lt($now) || $event->registration_deadline->eq($now);
    }

    /**
     * Statuses that may accept registrations (before applying gates).
     */
    public static function statusAllowsRegistration(Event $event): bool
    {
        return $event->status === EventStatus::REGISTRATION_OPEN;
    }

    /**
     * New registrations allowed only if:
     * 1) status is registration_open
     * 2) Gate B: deadline not passed (checked separately)
     * 3) Gate A: capacity not reached (checked separately)
     *
     * Note: sold_out status alone also blocks (statusAllowsRegistration false);
     * capacity gate still drives the transition into sold_out independently.
     *
     * @return array{allowed: bool, reason: string|null, capacity_reached: bool, deadline_passed: bool}
     */
    public static function evaluate(Event $event, $now = null): array
    {
        $capacityReached = self::isCapacityReached($event);
        $deadlinePassed = self::isRegistrationDeadlinePassed($event, $now);

        if (! self::statusAllowsRegistration($event)) {
            return [
                'allowed' => false,
                'reason' => 'status_not_open',
                'capacity_reached' => $capacityReached,
                'deadline_passed' => $deadlinePassed,
            ];
        }

        // Gate B — independent
        if ($deadlinePassed) {
            return [
                'allowed' => false,
                'reason' => 'registration_deadline_passed',
                'capacity_reached' => $capacityReached,
                'deadline_passed' => true,
            ];
        }

        // Gate A — independent
        if ($capacityReached) {
            return [
                'allowed' => false,
                'reason' => 'capacity_reached',
                'capacity_reached' => true,
                'deadline_passed' => false,
            ];
        }

        return [
            'allowed' => true,
            'reason' => null,
            'capacity_reached' => false,
            'deadline_passed' => false,
        ];
    }

    public static function canAcceptRegistration(Event $event, $now = null): bool
    {
        return self::evaluate($event, $now)['allowed'];
    }
}
