<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Settings extends Model
{
    public const EMAIL_SMTP_NAME = 'smtp';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'setting_type',
        'name',
        'slug',
        'details',
        'credential',
        'status',
        'is_global',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'status' => 'boolean',
        'is_global' => 'boolean',
    ];

    /**
     * Active/inactive email SMTP row (case-insensitive name match).
     */
    public function scopeEmailSmtp($query)
    {
        return $query->where('setting_type', 'email')
            ->whereRaw('LOWER(name) = ?', [self::EMAIL_SMTP_NAME]);
    }
}
