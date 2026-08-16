<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participation_id')->constrained('participations')->restrictOnDelete();
            $table->unsignedTinyInteger('rating'); // 1–5
            $table->text('comment')->nullable();
            $table->timestamp('submitted_at');
            $table->timestamps();

            $table->unique('participation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_feedback');
    }
};
