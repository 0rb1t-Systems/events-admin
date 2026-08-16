<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventInvitationTemplate extends Model
{
    /** @use HasFactory<\Database\Factories\EventInvitationTemplateFactory> */
    use HasFactory;

    protected $fillable = [
        'event_id',
        'mode',
        'system_template_id',
        'background_image_path',
        'config',
        'overlay_positions',
        'customizations',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'overlay_positions' => 'array',
            'customizations' => 'array',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function systemTemplate(): BelongsTo
    {
        return $this->belongsTo(InvitationSystemTemplate::class, 'system_template_id');
    }
}
