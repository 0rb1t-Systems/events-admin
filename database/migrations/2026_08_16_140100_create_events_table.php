<?php

use App\Enums\EventStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organizer_id')->constrained('organizers')->restrictOnDelete();
            $table->foreignId('event_category_id')->nullable()->constrained('event_categories')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('city')->nullable();
            $table->string('address')->nullable();
            // Optional at DB; app requires lat+lng as a pair when either is set
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('banner_path')->nullable();
            $table->boolean('featured')->default(false);
            $table->boolean('monetized')->default(false);
            $table->string('status')->default(EventStatus::DRAFT->value);
            // null capacity = unlimited; 0 = no seats (distinct)
            $table->unsignedInteger('capacity')->nullable();
            // Stand-in count until a registrations module updates it
            $table->unsignedInteger('registrations_count')->default(0);
            $table->timestamp('registration_deadline')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organizer_id', 'status']);
            $table->index(['status', 'starts_at']);
            $table->index('featured');
            $table->index('monetized');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
