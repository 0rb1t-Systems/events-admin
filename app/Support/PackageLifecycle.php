<?php

namespace App\Support;

use App\Enums\PackageStatus;
use App\Models\Organizer;
use App\Models\OrganizerSubscription;
use App\Models\Package;

/**
 * Upgrade / downgrade / selectability for organizer self-subscription.
 *
 * Rank rule (deterministic): compare `packages.tier_rank` only.
 * - Higher tier_rank = higher plan → upgrade allowed
 * - Same package_id while active → blocked (re-subscribe)
 * - Lower or equal tier_rank (different package) → blocked (downgrade / lateral)
 * - Archived packages → cannot newly purchase
 *
 * Admin does not use this for manual assign (ops override).
 */
class PackageLifecycle
{
    /**
     * @return array{
     *   selectable: bool,
     *   is_current: bool,
     *   upgrade_allowed: bool,
     *   blocked_reason: string|null,
     *   action: 'subscribe'|'upgrade'|null
     * }
     */
    public static function eligibility(Organizer $organizer, Package $target): array
    {
        $active = $organizer->activeSubscription;
        $currentPackage = $active?->package;

        $isCurrent = $active !== null
            && $currentPackage !== null
            && (int) $currentPackage->id === (int) $target->id;

        if ($target->status !== PackageStatus::ACTIVE) {
            return [
                'selectable' => false,
                'is_current' => $isCurrent,
                'upgrade_allowed' => false,
                'blocked_reason' => 'This package is not available for purchase.',
                'action' => null,
            ];
        }

        if ($active === null || $currentPackage === null) {
            return [
                'selectable' => true,
                'is_current' => false,
                'upgrade_allowed' => false,
                'blocked_reason' => null,
                'action' => 'subscribe',
            ];
        }

        if ($isCurrent) {
            return [
                'selectable' => false,
                'is_current' => true,
                'upgrade_allowed' => false,
                'blocked_reason' => 'You already have an active subscription to this package.',
                'action' => null,
            ];
        }

        if ((int) $target->tier_rank > (int) $currentPackage->tier_rank) {
            return [
                'selectable' => true,
                'is_current' => false,
                'upgrade_allowed' => true,
                'blocked_reason' => null,
                'action' => 'upgrade',
            ];
        }

        if ((int) $target->tier_rank < (int) $currentPackage->tier_rank) {
            return [
                'selectable' => false,
                'is_current' => false,
                'upgrade_allowed' => false,
                'blocked_reason' => 'Downgrade is not allowed while your current subscription is active.',
                'action' => null,
            ];
        }

        return [
            'selectable' => false,
            'is_current' => false,
            'upgrade_allowed' => false,
            'blocked_reason' => 'This package is not a higher tier than your current plan.',
            'action' => null,
        ];
    }

    public static function resolveAction(Organizer $organizer, Package $target): string
    {
        $eligibility = self::eligibility($organizer, $target);
        if (! $eligibility['selectable'] || $eligibility['action'] === null) {
            throw new \InvalidArgumentException($eligibility['blocked_reason'] ?? 'Package is not selectable.');
        }

        return $eligibility['action'];
    }

    public static function effectiveQuota(?OrganizerSubscription $sub): ?int
    {
        if (! $sub || ! $sub->isActive()) {
            return 0;
        }

        $snapshotQuota = $sub->package_snapshot['event_quota'] ?? null;
        if (array_key_exists('event_quota', $sub->package_snapshot ?? [])) {
            return $snapshotQuota;
        }

        return $sub->package?->event_quota;
    }
}
