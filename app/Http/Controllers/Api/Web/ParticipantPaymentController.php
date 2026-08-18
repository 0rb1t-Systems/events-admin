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

        return $this->successResponse(
            $payment->fresh(['participation', 'ticketType']),
            'Payment processed.'
        );
    }
}
