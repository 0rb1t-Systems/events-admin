<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ticket tiers per event (core monetization).
     *
     * quantity_sold is a STORED counter (not computed from participations).
     * Phase 6 Participation MUST claim seats with an atomic conditional UPDATE
     * (see .agent / TicketType::claimQuantityAtomically) — never read-then-write.
     */
    public function up(): void
    {
        Schema::create('ticket_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->restrictOnDelete();
            $table->string('name');
            $table->decimal('price', 12, 2)->default(0);
            // null = unlimited inventory; 0 = no inventory
            $table->unsignedInteger('quantity_limit')->nullable();
            // Stored sold counter — Phase 6 increments atomically
            $table->unsignedInteger('quantity_sold')->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            // Admin moderation: disable further sales without deleting history
            $table->boolean('sales_enabled')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['event_id', 'sort_order']);
            $table->index(['event_id', 'sales_enabled']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_types');
    }
};
