<?php

namespace App\Http\Controllers\Api;

use App\Models\Event;
use App\Models\Payment;
use App\Models\Participation;
use App\Services\EventFinanceService;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class PaymentController extends BaseController
{
    protected $model = Payment::class;

    protected $searchableFields = ['reference_id', 'payer_phone', 'status', 'failure_reason'];

    protected $sortableFields = ['id', 'amount', 'status', 'created_at'];

    protected $relationships = ['participation.user', 'participation.event', 'ticketType'];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function __construct(
        private PaymentService $payments,
        private EventFinanceService $finance,
    ) {}

    public function index(Request $request)
    {
        $query = Payment::query()->with($this->relationships);

        if ($request->filled('event_id')) {
            $query->whereHas('participation', fn ($q) => $q->where('event_id', $request->integer('event_id')));
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

    /**
     * Initiate WaafiPay charge (Web App / admin stand-in).
     */
    public function charge(Request $request)
    {
        $validated = $request->validate([
            'participation_id' => 'required|integer|exists:participations,id',
            'payer_phone' => 'required|string|max:20',
        ]);

        $participation = Participation::with('ticketType')->findOrFail($validated['participation_id']);

        try {
            $payment = $this->payments->charge($participation, $validated['payer_phone']);
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage());
        } catch (Throwable $e) {
            return $this->errorResponse($e->getMessage(), [], 502);
        }

        $this->logActivity(
            'Payment charge attempted',
            $payment,
            [
                'reference_id' => $payment->reference_id,
                'status' => $payment->status?->value,
                // never log apiKey
            ],
            'created'
        );

        return $this->successResponse($payment->fresh($this->relationships), 'Payment processed.');
    }

    public function refund(Request $request, $id)
    {
        $payment = Payment::find($id);
        if (! $payment) {
            return $this->notFoundResponse();
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            $payment = $this->payments->refund($payment, $validated['reason'] ?? null);
        } catch (RuntimeException $e) {
            // Machine-readable code matches Auth/Event/Organizer pattern (errors.error_code[])
            $errors = str_starts_with($e->getMessage(), 'Refund blocked:')
                ? ['error_code' => ['refund_blocked_payout_recorded']]
                : [];

            return $this->badRequestResponse($e->getMessage(), $errors);
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage());
        }

        $this->logActivity('Payment refunded', $payment, ['reference_id' => $payment->reference_id], 'updated');

        return $this->successResponse($payment->fresh($this->relationships), 'Payment refunded.');
    }

    public function eventFinance($eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        return $this->successResponse($this->finance->summary($event));
    }
}
