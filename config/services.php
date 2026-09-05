<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    /*
    | Resend API key is set at send-time from Admin Settings → Mail
    | (settings table), not from .env. MailService::configureMailSettings()
    | writes config('services.resend.key') before dispatching.
    */
    'resend' => [
        'key' => env('RESEND_KEY'), // optional fallback only; prefer Admin UI
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'webapp_api' => [
        'public_key' => env('WEBAPP_API_PUBLIC_KEY'),
    ],

    'google' => [
        // Web client ID (GIS). Same value as VITE_GOOGLE_CLIENT_ID on the Web App.
        'client_id' => env('GOOGLE_CLIENT_ID'),
    ],

];
