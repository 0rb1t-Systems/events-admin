<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\ParticipationPaymentStatus;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Throwable;

class ParticipantPaymentController extends WebController
{
    public function __construct(private PaymentService $payments) {}

    /**
     * Serialize a Payment to the Web API shape, always including failure fields
     * so the frontend can display the exact provider decline message.
     *
     * @return array<string, mixed>
     */
    private function serializePayment(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'status' => $payment->status?->value ?? $payment->status,
            'amount' => $payment->amount,
            'currency' => $payment->currency,
            'reference_id' => $payment->reference_id,
            'gateway' => $payment->gateway,
            'waafi_transaction_id' => $payment->waafi_transaction_id,
            'failure_code' => $payment->failure_code,
            'failure_reason' => $payment->failure_reason,
            'expires_at' => $payment->expires_at?->toISOString(),
            'created_at' => $payment->created_at?->toISOString(),
            'updated_at' => $payment->updated_at?->toISOString(),
        ];
    }

    public function charge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'participation_id' => 'required|integer',
            'payer_phone' => 'required|string|max:20',
        ]);

        $participation = $this->ownedParticipationOrFail($validated['participation_id']);
        if ($participation instanceof JsonResponse) {
            return $participation;
        }

        $alreadyPaid = $participation->payment_status === ParticipationPaymentStatus::PAID
            || Payment::query()
                ->where('participation_id', $participation->id)
                ->where('status', PaymentStatus::COMPLETED)
                ->exists();

        if ($alreadyPaid) {
            return $this->badRequestResponse('This participation is already paid.');
        }

        $participation->load('ticketType');

        try {
            $payment = $this->payments->charge($participation, $validated['payer_phone']);
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage());
        } catch (Throwable $e) {
            return $this->errorResponse($e->getMessage(), [], 502);
        }

        $payment = $payment->fresh(['participation', 'ticketType']);

        return $this->successResponse(
            $this->serializePayment($payment),
            'Payment processed.'
        );
    }
}
