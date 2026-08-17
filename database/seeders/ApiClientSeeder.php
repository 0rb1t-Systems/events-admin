<?php

namespace Database\Seeders;

use App\Models\ApiClient;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ApiClientSeeder extends Seeder
{
    public function run(): void
    {
        $publicKey = env('WEBAPP_API_PUBLIC_KEY');
        $secret = env('WEBAPP_API_SECRET');

        if (! is_string($publicKey) || $publicKey === '') {
            $publicKey = Str::random(40);
        }

        if (! is_string($secret) || $secret === '') {
            $secret = Str::random(64);
        }

        ApiClient::query()->updateOrCreate(
            ['public_key' => $publicKey],
            [
                'name' => 'Web App',
                'secret' => $secret,
                'active' => true,
            ]
        );
    }
}
