<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Promo / discount codes (add-on 12.6).
     *
     * Scope:
     * - event_id set  → usable ONLY on that event (query must filter event_id)
     * - event_id null + organizer_id set → organizer-wide (any event of that organizer)
     *
     * Unique (event_id, code) prevents duplicate codes per event.
     * Unique (organizer_id, code) where event_id is null for organizer-wide codes.
     */
    public function up(): void
    {
        Schema::create('discount_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code');
            $table->foreignId('event_id')->nullable()->constrained('events')->restrictOnDelete();
            $table->foreignId('organizer_id')->nullable()->constrained('organizers')->restrictOnDelete();
            $table->string('type'); // percent | fixed
            $table->decimal('value', 12, 2);
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['event_id', 'code']);
            $table->index(['organizer_id', 'code']);
            $table->index(['active', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discount_codes');
    }
};
