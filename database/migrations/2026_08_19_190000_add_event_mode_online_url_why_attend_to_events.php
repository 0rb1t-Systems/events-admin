<?php

use App\Enums\EventMode;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('event_mode')->default(EventMode::IN_PERSON->value)->after('address');
            $table->string('online_url', 500)->nullable()->after('event_mode');
            $table->json('why_attend')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['event_mode', 'online_url', 'why_attend']);
        });
    }
};
