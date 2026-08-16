<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventImage extends Model
{
    /** @use HasFactory<\Database\Factories\EventImageFactory> */
    use HasFactory;

    protected $fillable = [
        'event_id',
        'path',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * Delete the image file from public disk (Organization logo pattern).
     */
    public function deleteFileFromDisk(): void
    {
        if (! $this->path) {
            return;
        }

        $relative = ltrim($this->path, '/');
        $fullPath = public_path($relative);
        if (file_exists($fullPath) && is_file($fullPath)) {
            unlink($fullPath);
        }
    }
}
