<?php

namespace App\Services;

use App\Models\Settings;
use InvalidArgumentException;

/**
 * Platform commission rate stored in settings (slug: platform_commission_rate).
 * Payout requests MUST snapshot this value at creation — never recompute historically.
 */
class CommissionSettings
{
    public const SETTING_SLUG = 'platform_commission_rate';

    public const DEFAULT_RATE = 10.0;

    public static function currentRate(): float
    {
        $row = Settings::query()->where('slug', self::SETTING_SLUG)->first();
        if (! $row || ! $row->details) {
            return self::DEFAULT_RATE;
        }

        $details = is_array($row->details)
            ? $row->details
            : (json_decode((string) $row->details, true) ?: []);

        return (float) ($details['rate'] ?? self::DEFAULT_RATE);
    }

    public static function setRate(float $rate): Settings
    {
        if ($rate < 0 || $rate > 100) {
            throw new InvalidArgumentException('Commission rate must be between 0 and 100.');
        }

        return Settings::query()->updateOrCreate(
            ['slug' => self::SETTING_SLUG],
            [
                'setting_type' => 'platform',
                'name' => 'Commission Rate',
                'details' => json_encode(['rate' => round($rate, 2)]),
                'status' => true,
                'is_global' => true,
            ]
        );
    }
}
