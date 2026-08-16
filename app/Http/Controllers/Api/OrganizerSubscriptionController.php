<?php

namespace App\Http\Controllers\Api;

use App\Enums\SubscriptionStatus;
use App\Models\Organizer;
use App\Models\OrganizerSubscription;
use App\Models\Package;
use App\Support\EventQuota;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Admin oversight of organizer subscription history (not Web App self-serve CRUD).
 * Assign/cancel are operational oversight actions so Admin can manage plans before Web App exists.
 */
class OrganizerSubscriptionController extends BaseController
{
    protected $model = OrganizerSubscription::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id', 'started_at', 'expires_at', 'status', 'created_at'];

    protected $relationships = ['package', 'organizer'];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function index(Request $request)
    {
        $query = $this->model::query()->with($this->relationships);

        if ($request->filled('organizer_id')) {
            $query->where('organizer_id', $request->integer('organizer_id'));
        }
        if ($request->filled('package_id')) {
            $query->where('package_id', $request->integer('package_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $query = $this->applyApiFilters(
            $query,
            $request,
            $this->searchableFields,
            $this->sortableFields,
            'started_at',
            'desc'
        );

        $perPage = min((int) $request->input('per_page', 15), 100);
        $paginator = $query->paginate($perPage);

        $items = collect($paginator->items())->map(function (OrganizerSubscription $sub) {
            $eventsCreated = Organizer::find($sub->organizer_id)?->events()->count() ?? 0;

            return $this->subscriptionPayload($sub, $eventsCreated);
        });

        // Match paginatedResponse shape used by BaseController / DataTable
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

    public function show($id)
    {
        $subscription = OrganizerSubscription::with($this->relationships)->find($id);
        if (! $subscription) {
            return $this->notFoundResponse();
        }

        $organizer = Organizer::find($subscription->organizer_id);
        $eventsCreated = $organizer?->events()->count() ?? 0;

        $history = OrganizerSubscription::with('package')
            ->where('organizer_id', $subscription->organizer_id)
            ->orderByDesc('started_at')
            ->get()
            ->map(fn (OrganizerSubscription $sub) => $this->subscriptionPayload($sub, $eventsCreated));

        return $this->successResponse([
            'subscription' => $this->subscriptionPayload($subscription, $eventsCreated),
            'history' => $history,
        ]);
    }

    /**
     * Full history for one organizer (oversight).
     */
    public function forOrganizer(Request $request, $organizerId)
    {
        $organizer = Organizer::find($organizerId);
        if (! $organizer) {
            return $this->notFoundResponse('Organizer not found');
        }

        $eventsCreated = $organizer->events()->count();

        $rows = OrganizerSubscription::with('package')
            ->where('organizer_id', $organizerId)
            ->orderByDesc('started_at')
            ->get()
            ->map(fn (OrganizerSubscription $sub) => $this->subscriptionPayload($sub, $eventsCreated));

        $organizer->load('activeSubscription.package');
        $active = $organizer->activeSubscription;

        return $this->successResponse([
            'organizer_id' => (int) $organizerId,
            'active' => $active ? $this->subscriptionPayload($active, $eventsCreated) : null,
            'history' => $rows,
        ]);
    }

    /**
     * Assign a package: creates a new history row; previous active rows become cancelled.
     */
    public function assign(Request $request, $organizerId)
    {
        $organizer = Organizer::find($organizerId);
        if (! $organizer) {
            return $this->notFoundResponse('Organizer not found');
        }

        $validated = $request->validate([
            'package_id' => 'required|integer|exists:packages,id',
            'expires_at' => 'nullable|date|after:now',
        ]);

        $package = Package::findOrFail($validated['package_id']);
        if ($package->status !== \App\Enums\PackageStatus::ACTIVE) {
            return $this->badRequestResponse('Only active packages can be assigned.');
        }

        $subscription = DB::transaction(function () use ($organizer, $package, $validated) {
            OrganizerSubscription::query()
                ->where('organizer_id', $organizer->id)
                ->where('status', SubscriptionStatus::ACTIVE)
                ->update([
                    'status' => SubscriptionStatus::CANCELLED,
                    'expires_at' => now(),
                ]);

            return OrganizerSubscription::create([
                'organizer_id' => $organizer->id,
                'package_id' => $package->id,
                'status' => SubscriptionStatus::ACTIVE,
                'started_at' => now(),
                'expires_at' => $validated['expires_at'] ?? null,
            ]);
        });

        $subscription->load('package');
        $eventsCreated = $organizer->events()->count();

        $this->logActivity(
            'Organizer subscription assigned',
            $subscription,
            [
                'organizer_id' => $organizer->id,
                'package_id' => $package->id,
            ],
            'subscription_assigned'
        );

        return $this->createdResponse(
            $this->subscriptionPayload($subscription, $eventsCreated),
            'Subscription assigned'
        );
    }

    public function cancel($id)
    {
        $subscription = OrganizerSubscription::with('package')->find($id);
        if (! $subscription) {
            return $this->notFoundResponse();
        }

        if ($subscription->status !== SubscriptionStatus::ACTIVE) {
            return $this->badRequestResponse('Only active subscriptions can be cancelled.');
        }

        $subscription->status = SubscriptionStatus::CANCELLED;
        $subscription->expires_at = now();
        $subscription->save();

        $this->logActivity(
            'Organizer subscription cancelled',
            $subscription,
            ['organizer_id' => $subscription->organizer_id],
            'subscription_cancelled'
        );

        return $this->successResponse(
            $this->subscriptionPayload(
                $subscription->fresh('package'),
                Organizer::find($subscription->organizer_id)?->events()->count() ?? 0
            ),
            'Subscription cancelled'
        );
    }

    private function subscriptionPayload(OrganizerSubscription $sub, int $eventsCreated = 0): array
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
            'organizer' => $sub->relationLoaded('organizer') && $sub->organizer
                ? [
                    'id' => $sub->organizer->id,
                    'business_name' => $sub->organizer->business_name,
                    'contact_name' => $sub->organizer->contact_name,
                    'email' => $sub->organizer->email,
                ]
                : null,
            'package' => $package ? [
                'id' => $package->id,
                'name' => $package->name,
                'price' => $package->price,
                'event_quota' => $package->event_quota,
                'status' => $package->status,
            ] : null,
            // events_created = organizer's Event count (EventQuota null vs 0 respected)
            'quota_usage' => EventQuota::usagePayload($quota, $eventsCreated),
        ];
    }
}
