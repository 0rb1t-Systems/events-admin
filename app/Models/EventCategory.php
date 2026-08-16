<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EventCategory extends Model
{
    /** @use HasFactory<\Database\Factories\EventCategoryFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
    ];

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }
}
