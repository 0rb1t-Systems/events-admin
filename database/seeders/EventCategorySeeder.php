<?php

namespace Database\Seeders;

use App\Models\EventCategory;
use Illuminate\Database\Seeder;

class EventCategorySeeder extends Seeder
{
    public function run(): void
    {
        foreach (['Conference', 'Workshop', 'Concert', 'Sports', 'Networking', 'Festival'] as $name) {
            EventCategory::firstOrCreate(['name' => $name]);
        }
    }
}
