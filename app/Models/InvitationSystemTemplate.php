<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InvitationSystemTemplate extends Model
{
    /** @use HasFactory<\Database\Factories\InvitationSystemTemplateFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'thumbnail_path',
        'background_image_path',
        'default_overlay_positions',
        'default_customizations',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'default_overlay_positions' => 'array',
            'default_customizations' => 'array',
            'active' => 'boolean',
        ];
    }

    public function eventTemplates(): HasMany
    {
        return $this->hasMany(EventInvitationTemplate::class, 'system_template_id');
    }

    public function isUsedByAnyEvent(): bool
    {
        return $this->eventTemplates()->exists();
    }
}
