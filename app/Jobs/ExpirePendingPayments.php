<?php

namespace App\Jobs;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Services\ParticipationService;
use App\Services\PaymentService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Expires pending WaafiPay payments past expires_at, and abandoned unpaid
 * checkouts that never created a payment row.
 * Scheduled every 5 minutes — see routes/console.php.
 *
 * Effect on participation: payment_status→failed, status→cancelled, ticket quantity released.
 */
class ExpirePendingPayments implements ShouldQueue
{
    use Queueable;

    public function handle(PaymentService $payments, ParticipationService $participations): void
    {
        $stale = Payment::query()
            ->where('status', PaymentStatus::PENDING)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->limit(100)
            ->get();

        foreach ($stale as $payment) {
            try {
                $payments->expirePending($payment);
                Log::info('Expired pending payment', [
                    'payment_id' => $payment->id,
                    'reference_id' => $payment->reference_id,
                ]);
            } catch (\Throwable $e) {
                Log::warning('Failed to expire payment', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        try {
            $abandoned = $participations->expireAbandonedUnpaidCheckouts();
            if ($abandoned > 0) {
                Log::info('Expired abandoned unpaid checkouts', ['count' => $abandoned]);
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to expire abandoned unpaid checkouts', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
