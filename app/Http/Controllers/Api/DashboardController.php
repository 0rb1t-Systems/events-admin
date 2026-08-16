<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentStatus;
use App\Enums\PayoutRequestStatus;
use App\Models\Event;
use App\Models\Organizer;
use App\Models\Payment;
use App\Models\PayoutRequest;
use Illuminate\Http\Request;

/**
 * Admin dashboard aggregate stats (Prompt 11).
 */
class DashboardController extends BaseController
{
    protected $model = Event::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id'];

    protected $relationships = [];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function stats(Request $request)
    {
        $eventsByStatus = Event::query()
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn ($n) => (int) $n)
            ->all();

        foreach (\App\Enums\EventStatus::values() as $status) {
            $eventsByStatus[$status] = (int) ($eventsByStatus[$status] ?? 0);
        }

        $collected = (float) Payment::query()
            ->where('status', PaymentStatus::COMPLETED)
            ->sum('amount');

        return $this->successResponse([
            'total_organizers' => Organizer::query()->count(),
            'events_by_status' => $eventsByStatus,
            'total_events' => array_sum($eventsByStatus),
            'total_collected_funds' => round($collected, 2),
            'currency' => 'USD',
            'pending_payout_requests' => PayoutRequest::query()
                ->where('status', PayoutRequestStatus::REQUESTED)
                ->count(),
            'approved_awaiting_payment' => PayoutRequest::query()
                ->where('status', PayoutRequestStatus::APPROVED)
                ->count(),
        ]);
    }
}
