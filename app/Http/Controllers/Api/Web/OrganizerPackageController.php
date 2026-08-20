<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\PackageStatus;
use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\OrganizerSubscription;
use App\Models\OrganizerSubscriptionOrder;
use App\Models\Package;
use App\Services\OrganizerSubscriptionPurchaseService;
use App\Support\EventQuota;
use App\Support\PackageDuration;
use App\Support\PackageLifecycle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

/**
 * Organizer Web App package catalog, subscription lifecycle, quota, and self-purchase.
 */
class OrganizerPackageController extends BaseController
{
    use ResolvesOrganizerEvent;

    public function packages(): JsonResponse
    {
        $organizer = $this->organizer();
        $organizer->load('activeSubscription.package');

        $packages = Package::query()
            ->where('status', PackageStatus::ACTIVE)
            ->orderBy('tier_rank')
            ->orderBy('name')
            ->get()
            ->map(fn (Package $package) => $this->catalogPackagePayload($organizer, $package));

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

    public function history(): JsonResponse
    {
        $organizer = $this->organizer();
        $eventsCreated = $organizer->events()->count();

        $history = OrganizerSubscription::query()
            ->with('package')
            ->where('organizer_id', $organizer->id)
            ->orderByDesc('started_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (OrganizerSubscription $sub) => $this->subscriptionPayload($sub, $eventsCreated));

        return $this->successResponse(['history' => $history]);
    }

    public function quota(): JsonResponse
    {
        $organizer = $this->organizer();
        $organizer->load('activeSubscription.package');
        $eventsCreated = $organizer->events()->count();
        $sub = $organizer->activeSubscription;

        $quota = PackageLifecycle::effectiveQuota($sub);
        if (! $sub) {
            $quota = 0;
        }

        $package = $sub?->package;
        $snapshot = $sub?->package_snapshot;

        return $this->successResponse([
            ...EventQuota::usagePayload($quota, $eventsCreated),
            'has_active_subscription' => (bool) $sub,
            'package' => $package ? [
                'id' => $package->id,
                'name' => $snapshot['package_name'] ?? $package->name,
                'event_quota' => array_key_exists('event_quota', $snapshot ?? [])
                    ? $snapshot['event_quota']
                    : $package->event_quota,
                'duration_value' => $snapshot['duration_value'] ?? $package->duration_value,
                'duration_unit' => $snapshot['duration_unit'] ?? ($package->duration_unit?->value ?? $package->duration_unit),
                'duration_label' => $snapshot['duration_label'] ?? PackageDuration::labelForPackage($package),
                'tier_rank' => $snapshot['tier_rank'] ?? $package->tier_rank,
            ] : null,
            'subscription' => $sub ? [
                'id' => $sub->id,
                'status' => $sub->status,
                'started_at' => $sub->started_at,
                'expires_at' => $sub->expires_at,
                'seconds_remaining' => $this->secondsRemaining($sub),
            ] : null,
        ]);
    }

    public function subscribe(Request $request, OrganizerSubscriptionPurchaseService $purchases): JsonResponse
    {
        $validated = $request->validate([
            'package_id' => 'required|integer|exists:packages,id',
            'payer_phone' => 'nullable|string|max:32',
        ]);

        // Never accept client-submitted amount
        if ($request->exists('amount') || $request->exists('price') || $request->exists('action')) {
            return $this->badRequestResponse('Only package_id and payer_phone are accepted.');
        }

        try {
            $result = $purchases->purchase(
                $this->organizer(),
                (int) $validated['package_id'],
                $validated['payer_phone'] ?? null
            );
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage());
        }

        $eventsCreated = $this->organizer()->events()->count();
        $payload = [
            'outcome' => $result['outcome'],
            'message' => $result['message'],
            'order' => $this->orderPayload($result['order']),
            'subscription' => $result['subscription']
                ? $this->subscriptionPayload($result['subscription']->loadMissing('package'), $eventsCreated)
                : null,
        ];

        if ($result['outcome'] === 'activated') {
            return $this->successResponse($payload, $result['message']);
        }

        return response()->json([
            'success' => false,
            'message' => $result['message'],
            'data' => $payload,
            'status_code' => 422,
        ], 422);
    }

    public function orders(Request $request): JsonResponse
    {
        $organizer = $this->organizer();

        $query = OrganizerSubscriptionOrder::query()
            ->with('package')
            ->where('organizer_id', $organizer->id)
            ->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $paginator = $query->paginate($perPage);

        $items = collect($paginator->items())->map(fn (OrganizerSubscriptionOrder $order) => $this->orderPayload($order));

        return response()->json([
            'success' => true,
            'message' => 'Data retrieved successfully',
            'data' => $items->values()->all(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'has_more_pages' => $paginator->hasMorePages(),
            ],
            'status_code' => 200,
        ]);
    }

    public function showOrder(int $id): JsonResponse
    {
        $order = OrganizerSubscriptionOrder::query()
            ->with(['package', 'resultingSubscription.package'])
            ->where('organizer_id', $this->organizer()->id)
            ->whereKey($id)
            ->first();

        if (! $order) {
            return $this->notFoundResponse();
        }

        return $this->successResponse($this->orderPayload($order));
    }

    /**
     * @return array<string, mixed>
     */
    private function catalogPackagePayload($organizer, Package $package): array
    {
        $eligibility = PackageLifecycle::eligibility($organizer, $package);

        return [
            'id' => $package->id,
            'name' => $package->name,
            'description' => $package->description,
            'price' => $package->price,
            'event_quota' => $package->event_quota,
            'duration_value' => $package->duration_value,
            'duration_unit' => $package->duration_unit?->value ?? $package->duration_unit,
            'duration_label' => PackageDuration::labelForPackage($package),
            'tier_rank' => $package->tier_rank,
            'status' => $package->status,
            'is_current' => $eligibility['is_current'],
            'upgrade_allowed' => $eligibility['upgrade_allowed'],
            'selectable' => $eligibility['selectable'],
            'blocked_reason' => $eligibility['blocked_reason'],
            'action' => $eligibility['action'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function subscriptionPayload(OrganizerSubscription $sub, int $eventsCreated): array
    {
        $package = $sub->package;
        $snapshot = $sub->package_snapshot ?? [];
        $quota = array_key_exists('event_quota', $snapshot)
            ? $snapshot['event_quota']
            : $package?->event_quota;

        if (! $sub->isActive() && $sub->id === $this->organizer()->activeSubscription?->id) {
            // defensive
        }

        $effectiveQuota = $sub->isActive() ? $quota : 0;

        return [
            'id' => $sub->id,
            'organizer_id' => $sub->organizer_id,
            'package_id' => $sub->package_id,
            'status' => $sub->status,
            'source' => $sub->source,
            'started_at' => $sub->started_at,
            'expires_at' => $sub->expires_at,
            'seconds_remaining' => $this->secondsRemaining($sub),
            'package_snapshot' => $snapshot ?: null,
            'package' => $package ? [
                'id' => $package->id,
                'name' => $snapshot['package_name'] ?? $package->name,
                'price' => $snapshot['package_price'] ?? $package->price,
                'event_quota' => array_key_exists('event_quota', $snapshot) ? $snapshot['event_quota'] : $package->event_quota,
                'duration_value' => $snapshot['duration_value'] ?? $package->duration_value,
                'duration_unit' => $snapshot['duration_unit'] ?? ($package->duration_unit?->value ?? $package->duration_unit),
                'duration_label' => $snapshot['duration_label'] ?? PackageDuration::labelForPackage($package),
                'tier_rank' => $snapshot['tier_rank'] ?? $package->tier_rank,
                'status' => $package->status,
            ] : null,
            'quota_usage' => EventQuota::usagePayload(
                $sub->isActive() ? $quota : 0,
                $eventsCreated
            ),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function orderPayload(OrganizerSubscriptionOrder $order): array
    {
        return [
            'id' => $order->id,
            'organizer_id' => $order->organizer_id,
            'package_id' => $order->package_id,
            'action' => $order->action,
            'amount' => $order->amount,
            'currency' => $order->currency,
            'status' => $order->status,
            'reference_id' => $order->reference_id,
            'payer_phone' => $order->payer_phone,
            'failure_code' => $order->failure_code,
            'failure_reason' => $order->failure_reason,
            'package_snapshot' => $order->package_snapshot,
            'previous_subscription_id' => $order->previous_subscription_id,
            'resulting_subscription_id' => $order->resulting_subscription_id,
            'completed_at' => $order->completed_at,
            'expires_at' => $order->expires_at,
            'created_at' => $order->created_at,
            'package' => $order->relationLoaded('package') && $order->package
                ? [
                    'id' => $order->package->id,
                    'name' => $order->package->name,
                    'price' => $order->package->price,
                ]
                : null,
        ];
    }

    private function secondsRemaining(OrganizerSubscription $sub): ?int
    {
        if (! $sub->isActive() || $sub->expires_at === null) {
            return null;
        }

        return max(0, $sub->expires_at->getTimestamp() - now()->getTimestamp());
    }
}
