<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    /** @use HasFactory<\Database\Factories\PaymentFactory> */
    use HasFactory;

    protected $fillable = [
        'participation_id',
        'ticket_type_id',
        'amount',
        'currency',
        'status',
        'reference_id',
        'waafi_transaction_id',
        'waafi_issuer_transaction_id',
        'payer_phone',
        'failure_reason',
        'failure_code',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'status' => PaymentStatus::class,
            'expires_at' => 'datetime',
        ];
    }

    public function participation(): BelongsTo
    {
        return $this->belongsTo(Participation::class);
    }

    public function ticketType(): BelongsTo
    {
        return $this->belongsTo(TicketType::class);
    }

    /** Format for WaafiPay API boundary (string with 2 decimals). */
    public function amountForWaafi(): string
    {
        return number_format((float) $this->amount, 2, '.', '');
    }
}
