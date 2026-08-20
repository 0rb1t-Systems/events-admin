<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('packages', function (Blueprint $table) {
            // null + null = non-expiring (legacy / admin override). Both set = time-boxed.
            $table->unsignedInteger('duration_value')->nullable()->after('event_quota');
            $table->string('duration_unit', 16)->nullable()->after('duration_value');
            // Explicit upgrade rank: higher = better. Prefer this over price/quota heuristics.
            $table->unsignedInteger('tier_rank')->default(0)->after('duration_unit');
        });
    }

    public function down(): void
    {
        Schema::table('packages', function (Blueprint $table) {
            $table->dropColumn(['duration_value', 'duration_unit', 'tier_rank']);
        });
    }
};
