<?php

namespace App\Http\Controllers\Api;

use App\Models\Event;
use App\Models\PayoutRequest;
use App\Services\EventFinanceService;
use App\Services\PayoutService;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;

class PayoutRequestController extends BaseController
{
    protected $model = PayoutRequest::class;

    protected $searchableFields = ['status', 'admin_notes'];

    protected $sortableFields = [
        'id', 'requested_amount', 'status', 'commission_rate', 'created_at', 'paid_at',
    ];

    protected $relationships = ['organizer', 'event', 'reviewer'];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function __construct(
        private PayoutService $payouts,
        private EventFinanceService $finance,
    ) {}

    public function index(Request $request)
    {
        $query = PayoutRequest::query()->with($this->relationships);

        if ($request->filled('event_id')) {
            $query->where('event_id', $request->integer('event_id'));
        }
        if ($request->filled('organizer_id')) {
            $query->where('organizer_id', $request->integer('organizer_id'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $query = $this->applyApiFilters(
            $query,
            $request,
            $this->searchableFields,
            $this->sortableFields,
            'created_at',
            'desc'
        );

        return $this->paginateResponse($query, $request);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|integer|exists:events,id',
            'requested_amount' => 'required|numeric|min:0.01',
        ]);

        $event = Event::findOrFail($validated['event_id']);

        try {
            $payout = $this->payouts->request($event, (float) $validated['requested_amount']);
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage());
        }

        $this->logActivity(
            'Payout request created',
            $payout,
            [
                'requested_amount' => $payout->requested_amount,
                'commission_rate_snapshot' => $payout->commission_rate,
            ],
            'created'
        );

        return $this->createdResponse($payout->fresh($this->relationships));
    }

    public function show($id)
    {
        $payout = PayoutRequest::with($this->relationships)->find($id);
        if (! $payout) {
            return $this->notFoundResponse();
        }

        // Amounts for display from SNAPSHOT
        $snapshotAmounts = $payout->computeAmountsFromSnapshot();

        return $this->successResponse([
            'payout' => $payout,
            'snapshot_amounts' => $snapshotAmounts,
            'event_finance' => $this->finance->summary($payout->event_id),
        ]);
    }

    public function approve(Request $request, $id)
    {
        $payout = PayoutRequest::find($id);
        if (! $payout) {
            return $this->notFoundResponse();
        }

        $validated = $request->validate(['admin_notes' => 'nullable|string|max:2000']);

        try {
            $payout = $this->payouts->approve($payout, $request->user(), $validated['admin_notes'] ?? null);
        } catch (InvalidArgumentException|RuntimeException $e) {
            return $this->badRequestResponse($e->getMessage());
        }

        $this->logActivity('Payout approved', $payout, [
            'commission_rate_snapshot' => $payout->commission_rate,
            'commission_amount' => $payout->commission_amount,
            'net_amount' => $payout->net_amount,
        ], 'updated');

        return $this->successResponse($payout, 'Payout approved.');
    }

    public function reject(Request $request, $id)
    {
        $payout = PayoutRequest::find($id);
        if (! $payout) {
            return $this->notFoundResponse();
        }

        $validated = $request->validate(['admin_notes' => 'nullable|string|max:2000']);

        try {
            $payout = $this->payouts->reject($payout, $request->user(), $validated['admin_notes'] ?? null);
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage());
        }

        $this->logActivity('Payout rejected', $payout, [], 'updated');

        return $this->successResponse($payout, 'Payout rejected.');
    }

    public function recordPayment(Request $request, $id)
    {
        $payout = PayoutRequest::find($id);
        if (! $payout) {
            return $this->notFoundResponse();
        }

        $validated = $request->validate([
            'confirmed_amount' => 'nullable|numeric|min:0',
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        try {
            $payout = $this->payouts->recordPayment(
                $payout,
                $request->user(),
                isset($validated['confirmed_amount']) ? (float) $validated['confirmed_amount'] : null,
                $validated['admin_notes'] ?? null
            );
        } catch (InvalidArgumentException|RuntimeException $e) {
            return $this->badRequestResponse($e->getMessage());
        }

        $this->logActivity('Payout recorded as paid', $payout, [
            'net_amount' => $payout->net_amount,
            'commission_rate_snapshot' => $payout->commission_rate,
        ], 'updated');

        return $this->successResponse($payout, 'Payout marked paid.');
    }
}
