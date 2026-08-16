<?php

namespace App\Models;

use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizerSubscription extends Model
{
    /** @use HasFactory<\Database\Factories\OrganizerSubscriptionFactory> */
    use HasFactory;

    protected $fillable = [
        'organizer_id',
        'package_id',
        'status',
        'started_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'started_at' => 'datetime',
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

    public function isActive(): bool
    {
        if ($this->status !== SubscriptionStatus::ACTIVE) {
            return false;
        }

        // Time-boxed: past expires_at is not active (caller may also expire rows).
        if ($this->expires_at !== null && $this->expires_at->isPast()) {
            return false;
        }

        return true;
    }
}
