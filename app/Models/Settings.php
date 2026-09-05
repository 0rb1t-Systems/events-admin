<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Settings extends Model
{
    /** Canonical email provider setting name (Resend). */
    public const EMAIL_SETTING_NAME = 'resend';

    /** @deprecated Use EMAIL_SETTING_NAME — kept for legacy row lookup. */
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
     * Platform email provider row (Resend). Also matches legacy SMTP name for migration.
     */
    public function scopeEmailMail($query)
    {
        return $query->where('setting_type', 'email')
            ->where(function ($q) {
                $q->whereRaw('LOWER(name) = ?', [self::EMAIL_SETTING_NAME])
                    ->orWhereRaw('LOWER(name) = ?', [self::EMAIL_SMTP_NAME]);
            });
    }

    /**
     * @deprecated Use scopeEmailMail()
     */
    public function scopeEmailSmtp($query)
    {
        return $this->scopeEmailMail($query);
    }
}
