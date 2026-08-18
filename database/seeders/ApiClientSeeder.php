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

        if (! is_string($publicKey) || $publicKey === '') {
            $publicKey = Str::random(40);
        }

        ApiClient::query()->updateOrCreate(
            ['public_key' => $publicKey],
            [
                'name' => 'Web App',
                'secret' => Str::random(64),
                'active' => true,
            ]
        );
    }
}
