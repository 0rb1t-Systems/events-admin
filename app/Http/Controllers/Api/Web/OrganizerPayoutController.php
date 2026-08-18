<?php

namespace App\Http\Controllers\Api\Web;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\PayoutRequest;
use App\Services\EventFinanceService;
use App\Services\PayoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

/**
 * Organizer Web App payouts — per-event requests only (no batch, no approve/reject/pay).
 */
class OrganizerPayoutController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $relationships = ['organizer', 'event', 'reviewer'];

    public function __construct(
        private PayoutService $payouts,
        private EventFinanceService $finance,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = PayoutRequest::query()
            ->with($this->relationships)
            ->where('organizer_id', $this->organizer()->id)
            ->orderByDesc('created_at');

        $perPage = min((int) $request->input('per_page', 15), 100);

        return $this->successResponse($this->webPaginatorPayload($query->paginate($perPage)));
    }

    public function forEvent(Request $request, $event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $query = PayoutRequest::query()
            ->with($this->relationships)
            ->where('organizer_id', $this->organizer()->id)
            ->where('event_id', $owned->id)
            ->orderByDesc('created_at');

        $perPage = min((int) $request->input('per_page', 15), 100);

        return $this->successResponse([
            ...$this->webPaginatorPayload($query->paginate($perPage)),
            'event_finance' => $this->finance->summary($owned),
            'available_amount' => $this->finance->outstandingBalance($owned->id),
        ]);
    }

    public function storeForEvent(Request $request, $event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'requested_amount' => 'required|numeric|min:0.01',
        ]);

        try {
            $payout = $this->payouts->request(
                $owned,
                (float) $validated['requested_amount'],
                $this->organizer()
            );
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage());
        }

        $this->logActivity(
            'Payout request created',
            $payout,
            [
                'requested_amount' => $payout->requested_amount,
                'commission_rate_snapshot' => $payout->commission_rate,
                'event_id' => $owned->id,
            ],
            'created'
        );

        return $this->createdResponse($payout->fresh($this->relationships));
    }

    public function show($payoutRequest): JsonResponse
    {
        $owned = $this->ownedPayoutRequestOrFail($payoutRequest);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $owned->load($this->relationships);

        return $this->successResponse([
            'payout' => $owned,
            'snapshot_amounts' => $owned->computeAmountsFromSnapshot(),
            'event_finance' => $this->finance->summary($owned->event_id),
            'available_amount' => $this->finance->outstandingBalance($owned->event_id),
        ]);
    }
}
