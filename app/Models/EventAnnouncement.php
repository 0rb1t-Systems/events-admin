<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventAnnouncement extends Model
{
    protected $fillable = [
        'event_id', 'subject', 'body', 'sent_at', 'sent_by',
    ];

    protected function casts(): array
    {
        return ['sent_at' => 'datetime'];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
