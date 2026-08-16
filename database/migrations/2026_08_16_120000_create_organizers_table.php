<?php

use App\Enums\OrganizerStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Organizers are a separate identity from Users.
     * email is UNIQUE on this table only — may intentionally match a users.email.
     *
     * Future FKs (events, subscriptions) MUST use restrictOnDelete (or nullOnDelete
     * only where the relation is optional). Soft deletes keep the row, so related
     * records are preserved. Force-delete must be blocked while dependents exist.
     */
    public function up(): void
    {
        Schema::create('organizers', function (Blueprint $table) {
            $table->id();
            $table->string('business_name');
            $table->string('contact_name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('password');
            $table->string('status')->default(OrganizerStatus::ACTIVE->value);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizers');
    }
};
