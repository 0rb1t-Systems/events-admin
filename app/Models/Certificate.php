<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Certificate extends Model
{
    /** @use HasFactory<\Database\Factories\CertificateFactory> */
    use HasFactory;

    protected $fillable = [
        'participation_id', 'issued_at', 'file_path', 'file_url', 'verified',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'verified' => 'boolean',
        ];
    }

    public function participation(): BelongsTo
    {
        return $this->belongsTo(Participation::class);
    }
}
