<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Organizer-authored invitation card template (Web App designer later).
     * Admin: read-only oversight of config JSON.
     */
    public function up(): void
    {
        Schema::create('event_invitation_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->restrictOnDelete();
            // Flexible layout/branding blob for future Web App designer
            $table->json('config')->nullable();
            $table->timestamps();

            $table->unique('event_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_invitation_templates');
    }
};
