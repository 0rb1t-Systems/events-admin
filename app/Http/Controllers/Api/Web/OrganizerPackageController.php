<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\PackageStatus;
use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\OrganizerSubscription;
use App\Models\Package;
use App\Support\EventQuota;
use Illuminate\Http\JsonResponse;

/**
 * Organizer Web App package catalog, current subscription, and event quota. No purchase.
 */
class OrganizerPackageController extends BaseController
{
    use ResolvesOrganizerEvent;

    public function packages(): JsonResponse
    {
        $packages = Package::query()
            ->where('status', PackageStatus::ACTIVE)
            ->orderBy('name')
            ->get();

        return $this->successResponse($packages);
    }

    public function subscription(): JsonResponse
    {
        $organizer = $this->organizer();
        $organizer->load('activeSubscription.package');
        $eventsCreated = $organizer->events()->count();

        $active = $organizer->activeSubscription;
        $history = OrganizerSubscription::query()
            ->with('package')
            ->where('organizer_id', $organizer->id)
            ->orderByDesc('started_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (OrganizerSubscription $sub) => $this->subscriptionPayload($sub, $eventsCreated));

        return $this->successResponse([
            'active' => $active ? $this->subscriptionPayload($active, $eventsCreated) : null,
            'history' => $history,
        ]);
    }

    public function quota(): JsonResponse
    {
        $organizer = $this->organizer();
        $organizer->load('activeSubscription.package');
        $eventsCreated = $organizer->events()->count();
        $sub = $organizer->activeSubscription;
        $package = $sub?->package;

        // No active package → cannot create events (zero quota), not unlimited (null).
        $quota = $package?->event_quota;
        if (! $sub || ! $package) {
            $quota = 0;
        }

        return $this->successResponse([
            ...EventQuota::usagePayload($quota, $eventsCreated),
            'has_active_subscription' => (bool) ($sub && $package),
            'package' => $package ? [
                'id' => $package->id,
                'name' => $package->name,
                'event_quota' => $package->event_quota,
            ] : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function subscriptionPayload(OrganizerSubscription $sub, int $eventsCreated): array
    {
        $package = $sub->package;
        $quota = $package?->event_quota;

        return [
            'id' => $sub->id,
            'organizer_id' => $sub->organizer_id,
            'package_id' => $sub->package_id,
            'status' => $sub->status,
            'started_at' => $sub->started_at,
            'expires_at' => $sub->expires_at,
            'package' => $package ? [
                'id' => $package->id,
                'name' => $package->name,
                'price' => $package->price,
                'event_quota' => $package->event_quota,
                'status' => $package->status,
            ] : null,
            'quota_usage' => EventQuota::usagePayload($quota, $eventsCreated),
        ];
    }
}
