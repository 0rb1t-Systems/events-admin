<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Settings;

class SettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            [
                'setting_type' => 'email',
                'name' => Settings::EMAIL_SMTP_NAME,
                'slug' => 'email-smtp',
                'details' => null,
                'status' => 0,
                'is_global' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        Settings::insert($settings);
    }
}
