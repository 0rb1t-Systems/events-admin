<?php

namespace App\Enums;

/**
 * QR scan validation outcomes — three DISTINCT paths (never fold already_used into invalid).
 */
enum QrScanResult: string
{
    case VALID = 'valid';
    case ALREADY_USED = 'already_used';
    case INVALID = 'invalid';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
