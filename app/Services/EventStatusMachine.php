<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Models\Event;
use InvalidArgumentException;

/**
 * Explicit event status state machine.
 *
 * Transition table (from → allowed to):
 * | From                 | Allowed targets                                      |
 * |----------------------|------------------------------------------------------|
 * | draft                | published, cancelled                                 |
 * | published            | registration_open, draft, cancelled                  |
 * | registration_open    | sold_out, registration_closed, ongoing, cancelled    |
 * | sold_out             | registration_closed, ongoing, cancelled              |
 * | registration_closed  | ongoing, cancelled                                   |
 * | ongoing              | completed, cancelled                                 |
 * | completed            | (none — terminal)                                    |
 * | cancelled            | (none — terminal)                                    |
 *
 * Notes:
 * - cancelled is reachable from every non-terminal state except completed.
 * - sold_out is reached from registration_open (manual or capacity sync).
 * - Invalid transitions throw InvalidArgumentException (controller → 422).
 */
class EventStatusMachine
{
    /**
     * @var array<string, list<string>>
     */
    public const TRANSITIONS = [
        EventStatus::DRAFT->value => [
            EventStatus::PUBLISHED->value,
            EventStatus::CANCELLED->value,
        ],
        EventStatus::PUBLISHED->value => [
            EventStatus::REGISTRATION_OPEN->value,
            EventStatus::DRAFT->value,
            EventStatus::CANCELLED->value,
        ],
        EventStatus::REGISTRATION_OPEN->value => [
            EventStatus::SOLD_OUT->value,
            EventStatus::REGISTRATION_CLOSED->value,
            EventStatus::ONGOING->value,
            EventStatus::CANCELLED->value,
        ],
        EventStatus::SOLD_OUT->value => [
            EventStatus::REGISTRATION_CLOSED->value,
            EventStatus::ONGOING->value,
            EventStatus::CANCELLED->value,
        ],
        EventStatus::REGISTRATION_CLOSED->value => [
            EventStatus::ONGOING->value,
            EventStatus::CANCELLED->value,
        ],
        EventStatus::ONGOING->value => [
            EventStatus::COMPLETED->value,
            EventStatus::CANCELLED->value,
        ],
        EventStatus::COMPLETED->value => [],
        EventStatus::CANCELLED->value => [],
    ];

    public function canTransition(EventStatus|string $from, EventStatus|string $to): bool
    {
        $fromValue = $from instanceof EventStatus ? $from->value : $from;
        $toValue = $to instanceof EventStatus ? $to->value : $to;

        if ($fromValue === $toValue) {
            return true;
        }

        return in_array($toValue, self::TRANSITIONS[$fromValue] ?? [], true);
    }

    /**
     * @throws InvalidArgumentException
     */
    public function assertCanTransition(EventStatus|string $from, EventStatus|string $to): void
    {
        $fromValue = $from instanceof EventStatus ? $from->value : $from;
        $toValue = $to instanceof EventStatus ? $to->value : $to;

        if ($this->canTransition($fromValue, $toValue)) {
            return;
        }

        $allowed = implode(', ', self::TRANSITIONS[$fromValue] ?? []) ?: '(none — terminal state)';

        throw new InvalidArgumentException(
            "Invalid event status transition from [{$fromValue}] to [{$toValue}]. Allowed: {$allowed}."
        );
    }

    /**
     * Apply a status transition on the event (persists).
     *
     * @throws InvalidArgumentException
     */
    public function transition(Event $event, EventStatus|string $to): Event
    {
        $toStatus = $to instanceof EventStatus ? $to : EventStatus::from($to);
        $this->assertCanTransition($event->status, $toStatus);

        if ($event->status !== $toStatus) {
            $event->status = $toStatus;
            $event->save();
        }

        return $event->fresh();
    }

    /**
     * Capacity gate → sold_out: if currently registration_open and capacity is reached,
     * fire transition to sold_out. Real-time check vs registrations_count (not a separate queue job).
     */
    public function syncSoldOutFromCapacity(Event $event): Event
    {
        if ($event->status !== EventStatus::REGISTRATION_OPEN) {
            return $event;
        }

        if (! EventRegistrationGate::isCapacityReached($event)) {
            return $event;
        }

        return $this->transition($event, EventStatus::SOLD_OUT);
    }
}
