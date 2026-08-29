<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LuckyWheelAttempt extends Model
{
    protected $fillable = [
        'event_id',
        'winner_count',
        'participant_count',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'winner_count' => 'integer',
            'participant_count' => 'integer',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(Organizer::class, 'created_by');
    }

    public function winners(): HasMany
    {
        return $this->hasMany(LuckyWheelWinner::class);
    }
}
