<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('event_id')->constrained('events')->restrictOnDelete();
            $table->foreignId('ticket_type_id')->nullable()->constrained('ticket_types')->nullOnDelete();
            $table->string('status'); // ParticipationStatus
            // Mirror of payments table (Phase 6 SoT) — not an independent ledger
            $table->string('payment_status')->default('not_required');
            $table->json('custom_field_answers')->nullable();
            $table->string('qr_token')->nullable()->unique();
            $table->timestamps();

            $table->index(['event_id', 'status']);
            $table->index(['user_id', 'status']);
            $table->index(['ticket_type_id']);
        });

        /*
         | Unique: one non-cancelled participation per (user_id, event_id).
         | Cancelled rows are excluded from the unique key.
         |
         | SQLite: partial unique index WHERE status != 'cancelled'
         | MySQL: generated column NULL when cancelled + UNIQUE (NULLs don't collide)
         */
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            DB::statement(
                "CREATE UNIQUE INDEX participations_user_event_active_unique
                 ON participations (user_id, event_id)
                 WHERE status != 'cancelled'"
            );
        } else {
            // MySQL 8+ / MariaDB stored generated column
            DB::statement(
                "ALTER TABLE participations
                 ADD COLUMN active_user_event_key VARCHAR(64)
                 AS (IF(status = 'cancelled', NULL, CONCAT(user_id, '-', event_id))) STORED"
            );
            DB::statement(
                'CREATE UNIQUE INDEX participations_user_event_active_unique
                 ON participations (active_user_event_key)'
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('participations');
    }
};
