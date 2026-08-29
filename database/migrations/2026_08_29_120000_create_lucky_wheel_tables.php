<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lucky_wheel_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->restrictOnDelete();
            $table->unsignedInteger('winner_count');
            $table->unsignedInteger('participant_count');
            $table->foreignId('created_by')->nullable()->constrained('organizers')->nullOnDelete();
            $table->timestamps();

            $table->index(['event_id', 'created_at']);
        });

        Schema::create('lucky_wheel_winners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lucky_wheel_attempt_id')->constrained('lucky_wheel_attempts')->cascadeOnDelete();
            $table->foreignId('participation_id')->constrained('participations')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['lucky_wheel_attempt_id', 'participation_id'], 'lucky_wheel_attempt_participation_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lucky_wheel_winners');
        Schema::dropIfExists('lucky_wheel_attempts');
    }
};
