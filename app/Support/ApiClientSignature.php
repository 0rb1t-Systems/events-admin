<?php

namespace App\Support;

class ApiClientSignature
{
    public const TIMESTAMP_TOLERANCE_SECONDS = 300;

    public static function bodyHash(string $body): string
    {
        return hash('sha256', $body);
    }

    public static function payload(string $method, string $path, int|string $timestamp, string $body): string
    {
        return strtoupper($method).':'.$path.':'.$timestamp.':'.self::bodyHash($body);
    }

    public static function sign(string $method, string $path, string $body, int|string $timestamp, string $secret): string
    {
        return hash_hmac('sha256', self::payload($method, $path, $timestamp, $body), $secret);
    }

    /**
     * @return array{X-API-Key: string, X-API-Timestamp: string, X-API-Signature: string}
     */
    public static function headers(
        string $publicKey,
        string $secret,
        string $method,
        string $path,
        string $body = '',
        ?int $timestamp = null,
    ): array {
        $timestamp ??= time();

        return [
            'X-API-Key' => $publicKey,
            'X-API-Timestamp' => (string) $timestamp,
            'X-API-Signature' => self::sign($method, $path, $body, $timestamp, $secret),
        ];
    }
}
