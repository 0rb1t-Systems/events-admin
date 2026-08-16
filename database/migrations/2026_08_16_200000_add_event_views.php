<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->unsignedBigInteger('views_count')->default(0)->after('registrations_count');
        });

        // Optional detail log for Web App increments later; analytics uses events.views_count
        Schema::create('event_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('viewer_key')->nullable(); // anon fingerprint / user id later
            $table->timestamps();

            $table->index(['event_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_views');
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('views_count');
        });
    }
};
