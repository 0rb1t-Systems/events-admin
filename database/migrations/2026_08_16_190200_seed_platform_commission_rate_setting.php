<?php

use App\Models\Settings;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Settings::query()->updateOrCreate(
            ['slug' => 'platform_commission_rate'],
            [
                'setting_type' => 'platform',
                'name' => 'Commission Rate',
                'details' => json_encode(['rate' => 10.0]),
                'status' => true,
                'is_global' => true,
            ]
        );
    }

    public function down(): void
    {
        Settings::query()->where('slug', 'platform_commission_rate')->delete();
    }
};
