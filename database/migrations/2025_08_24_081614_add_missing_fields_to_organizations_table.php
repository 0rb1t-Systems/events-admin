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
        Schema::table('organizations', function (Blueprint $table) {
            if (!Schema::hasColumn('organizations', 'name')) {
                $table->string('name')->after('id');
            }
            if (!Schema::hasColumn('organizations', 'founded_date')) {
                $table->date('founded_date')->nullable()->after('name');
            }
            if (!Schema::hasColumn('organizations', 'logo_url')) {
                $table->string('logo_url')->nullable()->after('founded_date');
            }
            if (!Schema::hasColumn('organizations', 'website_url')) {
                $table->string('website_url')->nullable()->after('logo_url');
            }
            if (!Schema::hasColumn('organizations', 'email')) {
                $table->string('email')->nullable()->after('website_url');
            }
            if (!Schema::hasColumn('organizations', 'phone')) {
                $table->string('phone')->nullable()->after('email');
            }
            if (!Schema::hasColumn('organizations', 'address')) {
                $table->text('address')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('organizations', 'city')) {
                $table->string('city')->nullable()->after('address');
            }
            if (!Schema::hasColumn('organizations', 'postal_code')) {
                $table->string('postal_code')->nullable()->after('city');
            }
            if (!Schema::hasColumn('organizations', 'country')) {
                $table->string('country')->nullable()->after('postal_code');
            }
            if (!Schema::hasColumn('organizations', 'deleted_at')) {
                $table->softDeletes()->after('updated_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $columns = [
                'name',
                'founded_date',
                'logo_url',
                'website_url',
                'email',
                'phone',
                'address',
                'city',
                'postal_code',
                'country',
                'deleted_at',
            ];

            $columnsToDrop = array_filter($columns, function ($column) {
                return Schema::hasColumn('organizations', $column);
            });

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
