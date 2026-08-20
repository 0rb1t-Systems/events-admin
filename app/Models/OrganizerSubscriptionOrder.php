<?php

namespace App\Models;

use App\Enums\SubscriptionOrderAction;
use App\Enums\SubscriptionOrderStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizerSubscriptionOrder extends Model
{
    /** @use HasFactory<\Database\Factories\OrganizerSubscriptionOrderFactory> */
    use HasFactory;

    protected $fillable = [
        'organizer_id',
        'package_id',
        'action',
        'amount',
        'currency',
        'status',
        'reference_id',
        'payer_phone',
        'waafi_request_id',
        'waafi_transaction_id',
        'waafi_issuer_transaction_id',
        'failure_code',
        'failure_reason',
        'package_snapshot',
        'previous_subscription_id',
        'resulting_subscription_id',
        'completed_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'action' => SubscriptionOrderAction::class,
            'status' => SubscriptionOrderStatus::class,
            'package_snapshot' => 'array',
            'completed_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(Organizer::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function previousSubscription(): BelongsTo
    {
        return $this->belongsTo(OrganizerSubscription::class, 'previous_subscription_id');
    }

    public function resultingSubscription(): BelongsTo
    {
        return $this->belongsTo(OrganizerSubscription::class, 'resulting_subscription_id');
    }

    public function amountForWaafi(): string
    {
        return number_format((float) $this->amount, 2, '.', '');
    }

    public function isFree(): bool
    {
        return (float) $this->amount <= 0;
    }
}
