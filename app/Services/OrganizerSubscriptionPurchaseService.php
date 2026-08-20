<?php

namespace App\Services;

use App\Enums\PackageStatus;
use App\Enums\SubscriptionOrderAction;
use App\Enums\SubscriptionOrderStatus;
use App\Enums\SubscriptionSource;
use App\Enums\SubscriptionStatus;
use App\Models\Organizer;
use App\Models\OrganizerSubscription;
use App\Models\OrganizerSubscriptionOrder;
use App\Models\Package;
use App\Support\PackageDuration;
use App\Support\PackageLifecycle;
use App\Support\SomaliPhoneNormalizer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Organizer self-subscription / upgrade purchase flow.
 *
 * - Browser never submits amount; server snapshots package.price.
 * - Free packages skip Waafi and activate immediately.
 * - Paid packages charge via WaafiPayService; subscription activates only on approval.
 * - Upgrade: no proration; full new price; old row cancelled only after payment success.
 * - At most one effective active subscription per organizer.
 */
class OrganizerSubscriptionPurchaseService
{
    public function __construct(
        private WaafiPayService $waafi,
    ) {}

    /**
     * @return array{
     *   outcome: 'activated'|'payment_failed',
     *   message: string,
     *   order: OrganizerSubscriptionOrder,
     *   subscription: OrganizerSubscription|null
     * }
     */
    public function purchase(Organizer $organizer, int $packageId, ?string $payerPhone): array
    {
        $timeoutMinutes = (int) config('waafipay.pending_timeout_minutes', 15);

        /** @var array{order: OrganizerSubscriptionOrder, needs_waafi: bool} $prepared */
        $prepared = DB::transaction(function () use ($organizer, $packageId, $payerPhone, $timeoutMinutes) {
            /** @var Organizer $locked */
            $locked = Organizer::query()->whereKey($organizer->id)->lockForUpdate()->firstOrFail();
            $locked->load('activeSubscription.package');

            $package = Package::query()->whereKey($packageId)->lockForUpdate()->first();
            if (! $package) {
                throw new InvalidArgumentException('Package not found.');
            }

            if ($package->status !== PackageStatus::ACTIVE) {
                throw new InvalidArgumentException('This package is not available for purchase.');
            }

            PackageDuration::assertValidPair($package->duration_value, $package->duration_unit);

            $eligibility = PackageLifecycle::eligibility($locked, $package);
            if (! $eligibility['selectable'] || $eligibility['action'] === null) {
                throw new InvalidArgumentException($eligibility['blocked_reason'] ?? 'Package is not selectable.');
            }

            $pending = OrganizerSubscriptionOrder::query()
                ->where('organizer_id', $locked->id)
                ->where('status', SubscriptionOrderStatus::PENDING)
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->lockForUpdate()
                ->first();

            if ($pending) {
                throw new InvalidArgumentException(
                    'A subscription payment is already pending ('.$pending->reference_id.'). Wait for completion or expiry.'
                );
            }

            $action = SubscriptionOrderAction::from($eligibility['action']);
            $snapshot = PackageDuration::snapshot($package);
            $amount = number_format((float) $package->price, 2, '.', '');
            $isFree = (float) $amount <= 0;

            $phone = null;
            if (! $isFree) {
                if ($payerPhone === null || trim($payerPhone) === '') {
                    throw new InvalidArgumentException('payer_phone is required for paid packages.');
                }
                $phone = SomaliPhoneNormalizer::normalize($payerPhone);
            }

            $previous = $locked->activeSubscription;

            $order = OrganizerSubscriptionOrder::create([
                'organizer_id' => $locked->id,
                'package_id' => $package->id,
                'action' => $action,
                'amount' => $amount,
                'currency' => config('waafipay.currency', 'USD'),
                'status' => SubscriptionOrderStatus::PENDING,
                'reference_id' => 'SUB-'.Str::uuid()->toString(),
                'payer_phone' => $phone,
                'package_snapshot' => $snapshot,
                'previous_subscription_id' => $previous?->id,
                'expires_at' => $isFree ? null : now()->addMinutes($timeoutMinutes),
            ]);

            if ($isFree) {
                $subscription = $this->activateOrder($order, $locked, $package, $snapshot, $previous);

                return ['order' => $order->fresh(['package', 'resultingSubscription']), 'needs_waafi' => false, 'subscription' => $subscription];
            }

            return ['order' => $order, 'needs_waafi' => true, 'subscription' => null];
        });

        if (! $prepared['needs_waafi']) {
            return [
                'outcome' => 'activated',
                'message' => 'Subscription activated.',
                'order' => $prepared['order'],
                'subscription' => $prepared['subscription'] ?? $prepared['order']->resultingSubscription,
            ];
        }

        return $this->executeWaafi($prepared['order']);
    }

    /**
     * @return array{
     *   outcome: 'activated'|'payment_failed',
     *   message: string,
     *   order: OrganizerSubscriptionOrder,
     *   subscription: OrganizerSubscription|null
     * }
     */
    public function executeWaafi(OrganizerSubscriptionOrder $order): array
    {
        $order = $order->fresh();
        if (! $order || $order->status !== SubscriptionOrderStatus::PENDING) {
            throw new InvalidArgumentException('Only pending subscription orders can be charged.');
        }

        if ($order->isFree()) {
            throw new InvalidArgumentException('Free orders do not call Waafi.');
        }

        $result = $this->waafi->purchase(
            $order->reference_id,
            $order->amountForWaafi(),
            (string) $order->payer_phone
        );

        return DB::transaction(function () use ($order, $result) {
            /** @var OrganizerSubscriptionOrder $order */
            $order = OrganizerSubscriptionOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($order->status !== SubscriptionOrderStatus::PENDING) {
                return [
                    'outcome' => $order->status === SubscriptionOrderStatus::COMPLETED ? 'activated' : 'payment_failed',
                    'message' => $order->status === SubscriptionOrderStatus::COMPLETED
                        ? 'Subscription activated.'
                        : ($order->failure_reason ?? 'Payment failed.'),
                    'order' => $order->fresh(['package', 'resultingSubscription']),
                    'subscription' => $order->resultingSubscription,
                ];
            }

            /** @var Organizer $organizer */
            $organizer = Organizer::query()->whereKey($order->organizer_id)->lockForUpdate()->firstOrFail();
            $organizer->load('activeSubscription.package');

            /** @var Package $package */
            $package = Package::query()->whereKey($order->package_id)->lockForUpdate()->firstOrFail();

            $order->waafi_request_id = $result['request_id'] ?? null;
            $order->waafi_transaction_id = $result['transaction_id'] ?? null;
            $order->waafi_issuer_transaction_id = $result['issuer_transaction_id'] ?? null;

            if (! ($result['success'] ?? false)) {
                $order->status = SubscriptionOrderStatus::FAILED;
                $order->failure_code = $result['failure_code'] ?? 'payment_failed';
                $order->failure_reason = $result['failure_reason']
                    ?? $result['response_msg']
                    ?? 'Payment failed.';
                $order->completed_at = now();
                $order->save();

                // Failed upgrade must leave current subscription unchanged
                return [
                    'outcome' => 'payment_failed',
                    'message' => $order->failure_reason,
                    'order' => $order->fresh(['package']),
                    'subscription' => null,
                ];
            }

            // Payment succeeded — always activate (customer charged). Re-check only for logging.
            $previous = $organizer->activeSubscription;
            if ($order->previous_subscription_id) {
                $prevRow = OrganizerSubscription::query()
                    ->whereKey($order->previous_subscription_id)
                    ->lockForUpdate()
                    ->first();
                if ($prevRow && $prevRow->isActive()) {
                    $previous = $prevRow;
                }
            }

            $snapshot = $order->package_snapshot;
            $subscription = $this->activateOrder($order, $organizer, $package, $snapshot, $previous);

            return [
                'outcome' => 'activated',
                'message' => 'Subscription activated.',
                'order' => $order->fresh(['package', 'resultingSubscription']),
                'subscription' => $subscription,
            ];
        });
    }

    /**
     * Expire stale pending subscription orders (no Waafi retry; mark failed).
     */
    public function expirePending(OrganizerSubscriptionOrder $order): OrganizerSubscriptionOrder
    {
        return DB::transaction(function () use ($order) {
            $order = OrganizerSubscriptionOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if ($order->status !== SubscriptionOrderStatus::PENDING) {
                return $order;
            }

            if ($order->expires_at === null || $order->expires_at->isFuture()) {
                return $order;
            }

            $order->status = SubscriptionOrderStatus::FAILED;
            $order->failure_code = 'payment_expired';
            $order->failure_reason = 'Payment timed out waiting for approval.';
            $order->completed_at = now();
            $order->save();

            return $order;
        });
    }

    /**
     * Mark soft-expired active rows as expired (cleanup). Business checks must also use expires_at.
     */
    public function markElapsedSubscriptionsExpired(int $limit = 200): int
    {
        $count = 0;
        $rows = OrganizerSubscription::query()
            ->where('status', SubscriptionStatus::ACTIVE)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->orderBy('id')
            ->limit($limit)
            ->get();

        foreach ($rows as $row) {
            $row->status = SubscriptionStatus::EXPIRED;
            $row->save();
            $count++;
        }

        return $count;
    }

    /**
     * @param  array<string, mixed>  $snapshot
     */
    private function activateOrder(
        OrganizerSubscriptionOrder $order,
        Organizer $organizer,
        Package $package,
        array $snapshot,
        ?OrganizerSubscription $previous,
    ): OrganizerSubscription {
        $startedAt = now();
        $expiresAt = PackageDuration::expiresAt(
            $startedAt,
            $package->duration_value,
            $package->duration_unit
        );

        if ($previous && $previous->isActive()) {
            $previous->status = SubscriptionStatus::CANCELLED;
            $previous->expires_at = $startedAt;
            $previous->save();
        }

        // Cancel any other lingering status=active rows (soft-expired leftovers)
        OrganizerSubscription::query()
            ->where('organizer_id', $organizer->id)
            ->where('status', SubscriptionStatus::ACTIVE)
            ->when($previous, fn ($q) => $q->where('id', '!=', $previous->id))
            ->update([
                'status' => SubscriptionStatus::CANCELLED,
                'expires_at' => $startedAt,
            ]);

        $source = $order->action === SubscriptionOrderAction::UPGRADE
            ? SubscriptionSource::SELF_UPGRADE
            : SubscriptionSource::SELF_SUBSCRIBE;

        $subscription = OrganizerSubscription::create([
            'organizer_id' => $organizer->id,
            'package_id' => $package->id,
            'status' => SubscriptionStatus::ACTIVE,
            'started_at' => $startedAt,
            'expires_at' => $expiresAt,
            'package_snapshot' => $snapshot,
            'source' => $source,
            'subscription_order_id' => $order->id,
        ]);

        $order->status = SubscriptionOrderStatus::COMPLETED;
        $order->resulting_subscription_id = $subscription->id;
        $order->completed_at = $startedAt;
        $order->failure_code = null;
        $order->failure_reason = null;
        $order->save();

        return $subscription->load('package');
    }
}
