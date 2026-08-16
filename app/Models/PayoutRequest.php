<?php

namespace App\Models;

use App\Enums\PayoutRequestStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayoutRequest extends Model
{
    /** @use HasFactory<\Database\Factories\PayoutRequestFactory> */
    use HasFactory;

    protected $fillable = [
        'organizer_id',
        'event_id',
        'requested_amount',
        'status',
        'commission_rate',
        'commission_amount',
        'net_amount',
        'admin_notes',
        'reviewed_by',
        'reviewed_at',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'requested_amount' => 'decimal:2',
            'commission_rate' => 'decimal:2',
            'commission_amount' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'status' => PayoutRequestStatus::class,
            'reviewed_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(Organizer::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Commission/net from SNAPSHOTTED rate — never live settings.
     *
     * @return array{commission_amount: string, net_amount: string}
     */
    public function computeAmountsFromSnapshot(): array
    {
        $requested = (float) $this->requested_amount;
        $rate = (float) $this->commission_rate;
        $commission = round($requested * ($rate / 100), 2);
        $net = round($requested - $commission, 2);

        return [
            'commission_amount' => number_format($commission, 2, '.', ''),
            'net_amount' => number_format($net, 2, '.', ''),
        ];
    }
}
