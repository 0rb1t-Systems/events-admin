<?php

namespace App\Jobs;

use App\Enums\SubscriptionOrderStatus;
use App\Models\OrganizerSubscriptionOrder;
use App\Services\OrganizerSubscriptionPurchaseService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Expires pending organizer subscription Waafi orders past expires_at,
 * and marks soft-elapsed active subscriptions as expired.
 */
class ExpireOrganizerSubscriptions implements ShouldQueue
{
    use Queueable;

    public function handle(OrganizerSubscriptionPurchaseService $purchases): void
    {
        $stale = OrganizerSubscriptionOrder::query()
            ->where('status', SubscriptionOrderStatus::PENDING)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->limit(100)
            ->get();

        foreach ($stale as $order) {
            try {
                $purchases->expirePending($order);
                Log::info('Expired pending subscription order', [
                    'order_id' => $order->id,
                    'reference_id' => $order->reference_id,
                ]);
            } catch (\Throwable $e) {
                Log::warning('Failed to expire subscription order', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $marked = $purchases->markElapsedSubscriptionsExpired();
        if ($marked > 0) {
            Log::info('Marked elapsed organizer subscriptions expired', ['count' => $marked]);
        }
    }
}
