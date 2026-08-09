<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Settings;
use App\Services\CommonServices;

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
                'name' => 'SMTP',
                'slug' => CommonServices::generateSlug('SMTP', Settings::class),
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
