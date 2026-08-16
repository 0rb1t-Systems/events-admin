<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Somali MSISDN normalizer for WaafiPay / Hormuud EVC.
 * Accepts 0XXXXXXXXX, XXXXXXXXX (9-digit local), or 252XXXXXXXXX → 252XXXXXXXXX.
 */
class SomaliPhoneNormalizer
{
    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (preg_match('/^252\d{9}$/', $digits) === 1) {
            return $digits;
        }

        if (preg_match('/^0(\d{9})$/', $digits, $m) === 1) {
            return '252'.$m[1];
        }

        if (preg_match('/^\d{9}$/', $digits) === 1) {
            return '252'.$digits;
        }

        throw new InvalidArgumentException(
            'Phone must be a Somali MSISDN (0XXXXXXXXX, XXXXXXXXX, or 252XXXXXXXXX).'
        );
    }

    public static function isValid(string $phone): bool
    {
        try {
            self::normalize($phone);

            return true;
        } catch (InvalidArgumentException) {
            return false;
        }
    }
}
