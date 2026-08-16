<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-event registration form schema (organizer-authored; Admin read-only).
     * Answers live on participations.custom_field_answers (JSON snapshot at submit time) —
     * no FK from answers to fields, so schema changes never invalidate historical rows.
     */
    public function up(): void
    {
        Schema::create('event_form_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->restrictOnDelete();
            // Unique within event, not globally
            $table->string('key');
            $table->string('label');
            $table->string('type'); // FormFieldType
            $table->json('options')->nullable(); // select/checkbox choices
            $table->boolean('required')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            // Soft-handle: deactivate instead of hard-delete when answers exist
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['event_id', 'key']);
            $table->index(['event_id', 'active', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_form_fields');
    }
};
