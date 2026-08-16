<?php

use App\Enums\UserType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 1: ensure user_type defaults to admin for backward compatibility
     * and backfill all existing rows to admin (participants are not introduced yet).
     * Does not edit the original add_user_fields migration.
     */
    public function up(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'user_type')) {
            return;
        }

        // Backfill every existing row to admin (seeded/demo staff must remain admin).
        DB::table('users')->update(['user_type' => UserType::ADMIN->value]);

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY user_type ENUM('admin', 'user') NOT NULL DEFAULT 'admin'");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE users ALTER COLUMN user_type SET DEFAULT 'admin'");
        }
        // SQLite: row backfill is enough; column default change requires table rebuild / dbal.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'user_type')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY user_type ENUM('admin', 'user') NOT NULL DEFAULT 'user'");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE users ALTER COLUMN user_type SET DEFAULT 'user'");
        }
    }
};
