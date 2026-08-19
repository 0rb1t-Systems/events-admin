<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('participations', function (Blueprint $table) {
            $table->foreignId('discount_code_id')->nullable()->after('ticket_type_id')
                ->constrained('discount_codes')->nullOnDelete();
            $table->decimal('original_amount', 12, 2)->nullable()->after('payment_status');
            $table->decimal('discount_amount', 12, 2)->nullable()->after('original_amount');
            $table->decimal('final_amount', 12, 2)->nullable()->after('discount_amount');
            $table->json('discount_code_snapshot')->nullable()->after('final_amount');
            $table->boolean('discount_usage_consumed')->default(false)->after('discount_code_snapshot');
        });

        // SQLite table rebuilds drop partial unique indexes; restore one-active-participation-per-user-event.
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS participations_user_event_active_unique');
            DB::statement(
                "CREATE UNIQUE INDEX participations_user_event_active_unique
                 ON participations (user_id, event_id)
                 WHERE status != 'cancelled'"
            );
        }
    }

    public function down(): void
    {
        Schema::table('participations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('discount_code_id');
            $table->dropColumn([
                'original_amount',
                'discount_amount',
                'final_amount',
                'discount_code_snapshot',
                'discount_usage_consumed',
            ]);
        });
    }
};
