<?php

namespace App\Models;

use App\Enums\QrScanResult;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QrScanLog extends Model
{
    /** @use HasFactory<\Database\Factories\QrScanLogFactory> */
    use HasFactory;

    protected $fillable = [
        'scanned_token',
        'participation_id',
        'event_id',
        'result',
        'gate',
        'scanner_user_id',
        'scanner_organizer_id',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'result' => QrScanResult::class,
            'meta' => 'array',
        ];
    }

    public function participation(): BelongsTo
    {
        return $this->belongsTo(Participation::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function scannerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scanner_user_id');
    }

    public function scannerOrganizer(): BelongsTo
    {
        return $this->belongsTo(Organizer::class, 'scanner_organizer_id');
    }
}
