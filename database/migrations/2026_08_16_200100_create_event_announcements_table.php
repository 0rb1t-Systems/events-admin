<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->restrictOnDelete();
            $table->string('subject');
            $table->text('body');
            $table->timestamp('sent_at')->nullable();
            // Organizer FK later when Web App owns sending; nullable for now
            $table->unsignedBigInteger('sent_by')->nullable();
            $table->timestamps();

            $table->index(['event_id', 'sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_announcements');
    }
};
