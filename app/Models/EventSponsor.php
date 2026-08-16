<?php

namespace App\Models;

use App\Enums\SponsorTier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventSponsor extends Model
{
    protected $fillable = [
        'event_id', 'name', 'logo_path', 'tier', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'tier' => SponsorTier::class,
            'sort_order' => 'integer',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
