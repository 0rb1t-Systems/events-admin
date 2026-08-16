<?php

return [
    /*
    |--------------------------------------------------------------------------
    | WaafiPay (Hormuud EVC) — Phase 6
    |--------------------------------------------------------------------------
    | Credentials MUST come from env — never hardcode, never expose to FE,
    | never log apiKey in plaintext.
    |
    | Currency assumption: USD (WaafiPay documented example currency).
    | Timeout: 180 seconds — customer approves on phone before response returns;
    | Laravel/Guzzle default (~30s) would kill the request early.
    */

    'base_url' => env('WAAFI_BASE_URL', 'https://api.waafipay.net/asm'),

    'merchant_uid' => env('WAAFI_MERCHANT_UID'),
    'api_user_id' => env('WAAFI_API_USER_ID'),
    'api_key' => env('WAAFI_API_KEY'),

    'currency' => env('WAAFI_CURRENCY', 'USD'),

    /** HTTP client timeout in seconds (2–5 min window). */
    'http_timeout' => (int) env('WAAFI_HTTP_TIMEOUT', 180),

    /**
     * Pending payments older than this (minutes) are expired by ExpirePendingPayments job.
     * On expire: payment→failed, participation payment_status→failed, cancel participation
     * and release ticket quantity so seats are not held unpaid forever.
     */
    'pending_timeout_minutes' => (int) env('WAAFI_PENDING_TIMEOUT_MINUTES', 15),

    'service_name' => 'API_PURCHASE',
    'payment_method' => 'MWALLET_ACCOUNT',
];
