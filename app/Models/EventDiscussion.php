<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventDiscussion extends Model
{
    protected $fillable = [
        'event_id',
        'user_id',
        'speaker_id',
        'body',
        'status',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function speaker(): BelongsTo
    {
        return $this->belongsTo(EventSpeaker::class, 'speaker_id');
    }
}
