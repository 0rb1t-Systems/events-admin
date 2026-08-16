<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventFeedback extends Model
{
    /** @use HasFactory<\Database\Factories\EventFeedbackFactory> */
    use HasFactory;

    protected $table = 'event_feedback';

    protected $fillable = [
        'participation_id', 'rating', 'comment', 'hidden', 'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'hidden' => 'boolean',
            'submitted_at' => 'datetime',
        ];
    }

    public function participation(): BelongsTo
    {
        return $this->belongsTo(Participation::class);
    }
}
