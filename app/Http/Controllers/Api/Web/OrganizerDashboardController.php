<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\PayoutRequestStatus;
use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\Event;
use App\Models\Organizer;
use App\Models\PayoutRequest;
use App\Services\EventFinanceService;
use App\Support\EventQuota;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizerDashboardController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = Organizer::class;

    public function __construct(private EventFinanceService $finance) {}

    public function index(Request $request): JsonResponse
    {
        $organizer = $this->organizer();
        $organizer->load('activeSubscription.package');

        $events = Event::query()
            ->where('organizer_id', $organizer->id)
            ->get(['id', 'registrations_count']);

        $totalEvents = $events->count();
        $totalRegistrations = (int) $events->sum('registrations_count');

        $totalRevenue = 0.0;
        $availablePayout = 0.0;
        foreach ($events as $event) {
            $totalRevenue += $this->finance->totalCollected((int) $event->id);
            $availablePayout += $this->finance->outstandingBalance((int) $event->id);
        }

        $eventIds = $events->pluck('id');
        $pendingPayout = $eventIds->isEmpty()
            ? 0.0
            : (float) PayoutRequest::query()
                ->whereIn('event_id', $eventIds)
                ->whereIn('status', [
                    PayoutRequestStatus::REQUESTED->value,
                    PayoutRequestStatus::APPROVED->value,
                ])
                ->sum('requested_amount');

        $subscription = $organizer->activeSubscription;
        $package = $subscription?->package;

        $data = [
            'organizer' => $this->organizerPayload($organizer),
            'active_subscription' => $subscription,
            'total_events' => $totalEvents,
            'total_registrations' => $totalRegistrations,
            'total_revenue' => round($totalRevenue, 2),
            'available_payout' => round($availablePayout, 2),
            'pending_payout' => round($pendingPayout, 2),
            'recent_events' => Event::query()
                ->where('organizer_id', $organizer->id)
                ->with('category')
                ->latest('created_at')
                ->limit(5)
                ->get(),
        ];

        // EventQuota treats null quota as unlimited — omit when there is no package
        // so a missing subscription is never reported as unlimited events.
        if ($package) {
            $data['quota'] = EventQuota::usagePayload($package->event_quota, $totalEvents);
        }

        return $this->successResponse($data);
    }

    /**
     * @return array<string, mixed>
     */
    private function organizerPayload(Organizer $organizer): array
    {
        return [
            'id' => $organizer->id,
            'business_name' => $organizer->business_name,
            'contact_name' => $organizer->contact_name,
            'email' => $organizer->email,
            'phone' => $organizer->phone,
            'status' => $organizer->status instanceof \BackedEnum
                ? $organizer->status->value
                : $organizer->status,
        ];
    }
}
