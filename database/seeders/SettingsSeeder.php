<?php

namespace Database\Seeders;

use App\Models\Settings;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Settings::query()->updateOrCreate(
            [
                'setting_type' => 'email',
                'name' => Settings::EMAIL_SETTING_NAME,
            ],
            [
                'slug' => 'email-resend',
                'details' => null,
                'status' => false,
                'is_global' => true,
            ]
        );
    }
}
