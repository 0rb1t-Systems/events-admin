<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Payout requests — PER EVENT (not multi-event).
     * commission_rate is snapshotted at request creation; never recompute from live settings.
     */
    public function up(): void
    {
        Schema::create('payout_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organizer_id')->constrained('organizers')->restrictOnDelete();
            $table->foreignId('event_id')->constrained('events')->restrictOnDelete();
            $table->decimal('requested_amount', 12, 2);
            $table->string('status'); // PayoutRequestStatus
            // Snapshot at request time — historical display MUST read these columns
            $table->decimal('commission_rate', 5, 2); // percentage e.g. 10.00
            $table->decimal('commission_amount', 12, 2)->nullable();
            $table->decimal('net_amount', 12, 2)->nullable();
            $table->text('admin_notes')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['event_id', 'status']);
            $table->index(['organizer_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_requests');
    }
};
