<?php

namespace App\Models;

use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Models\DiscountCode;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Participation extends Model
{
    /** @use HasFactory<\Database\Factories\ParticipationFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'event_id',
        'ticket_type_id',
        'discount_code_id',
        'status',
        'payment_status',
        'original_amount',
        'discount_amount',
        'final_amount',
        'discount_code_snapshot',
        'discount_usage_consumed',
        'custom_field_answers',
        'qr_token',
    ];

    protected function casts(): array
    {
        return [
            'status' => ParticipationStatus::class,
            'payment_status' => ParticipationPaymentStatus::class,
            'custom_field_answers' => 'array',
            'discount_code_snapshot' => 'array',
            'original_amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'final_amount' => 'decimal:2',
            'discount_usage_consumed' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function ticketType(): BelongsTo
    {
        return $this->belongsTo(TicketType::class);
    }

    public function discountCode(): BelongsTo
    {
        return $this->belongsTo(DiscountCode::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function certificate(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Certificate::class);
    }

    public function feedback(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(EventFeedback::class);
    }

    public function qrScanLogs(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(QrScanLog::class);
    }

    public function occupiesSeat(): bool
    {
        return in_array($this->status?->value ?? $this->status, ParticipationStatus::seatOccupying(), true);
    }

    public function isWaitlisted(): bool
    {
        return $this->status === ParticipationStatus::WAITLISTED;
    }

    public function isCancelled(): bool
    {
        return $this->status === ParticipationStatus::CANCELLED;
    }
}
