<?php

namespace App\Http\Controllers\Api;

use App\Models\Event;
use App\Models\Payment;
use App\Models\Participation;
use App\Services\EventFinanceService;
use App\Services\PaymentService;
use App\Traits\RejectsAdminPanelOrganizerActions;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class PaymentController extends BaseController
{
    use RejectsAdminPanelOrganizerActions;

    protected $model = Payment::class;

    protected $searchableFields = ['reference_id', 'payer_phone', 'status', 'failure_reason'];

    protected $sortableFields = ['id', 'amount', 'status', 'created_at'];

    protected $relationships = ['participation.user', 'participation.event.organizer', 'ticketType'];

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
        if ($request->filled('organizer_id')) {
            $query->whereHas(
                'participation.event',
                fn ($q) => $q->where('organizer_id', $request->integer('organizer_id'))
            );
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->string('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->string('date_to'));
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
     * Initiate WaafiPay charge (organizer / participant Web App).
     * Admin Panel tokens are rejected — charging is not a platform-admin action.
     */
    public function charge(Request $request)
    {
        if ($denied = $this->rejectIfAdminPanelToken()) {
            return $denied;
        }

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

    /**
     * Record a manual/offline payment for a participation (organizer Web App).
     * Admin Panel tokens are rejected — offline/free entry is an organizer decision.
     */
    public function recordManual(Request $request)
    {
        if ($denied = $this->rejectIfAdminPanelToken()) {
            return $denied;
        }

        $validated = $request->validate([
            'participation_id' => 'required|integer|exists:participations,id',
            'amount' => 'nullable|numeric|min:0',
            'note' => 'nullable|string|max:500',
        ]);

        $participation = Participation::findOrFail($validated['participation_id']);

        try {
            $payment = $this->payments->recordManual(
                $participation,
                isset($validated['amount']) ? (float) $validated['amount'] : null,
                $validated['note'] ?? null
            );
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage());
        }

        $this->logActivity(
            'Manual payment recorded',
            $payment,
            [
                'reference_id' => $payment->reference_id,
                'amount' => $payment->amount,
            ],
            'created'
        );

        return $this->createdResponse($payment->fresh($this->relationships), 'Manual payment recorded.');
    }
}
