<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('user_type', ['admin', 'user'])->default('user')->after('password');
            $table->string('phone')->nullable()->after('user_type');
            $table->text('address')->nullable()->after('phone');
            $table->string('profile_image')->nullable()->after('address');
            $table->string('reset_code')->nullable()->after('profile_image');
            $table->string('email_verification_code')->nullable()->after('reset_code');
            $table->timestamp('email_verification_expires_at')->nullable()->after('email_verification_code');
            $table->string('fcm_token')->nullable()->after('email_verification_expires_at');
            $table->enum('provider', ['email', 'google', 'apple'])->nullable()->after('fcm_token');
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active')->after('provider');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'user_type',
                'phone',
                'address',
                'profile_image',
                'reset_code',
                'email_verification_code',
                'fcm_token',
                'provider',
                'status'
            ]);
        });
    }
};
