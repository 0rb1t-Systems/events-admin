<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LuckyWheelWinner extends Model
{
    protected $fillable = [
        'lucky_wheel_attempt_id',
        'participation_id',
    ];

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(LuckyWheelAttempt::class, 'lucky_wheel_attempt_id');
    }

    public function participation(): BelongsTo
    {
        return $this->belongsTo(Participation::class);
    }
}
