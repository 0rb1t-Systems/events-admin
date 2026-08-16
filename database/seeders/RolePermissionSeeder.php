<?php

namespace Database\Seeders;

use App\Enums\UserType;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // users
            'view users',
            'create users',
            'edit users',
            'delete users',

            // roles
            'view roles',
            'create roles',
            'edit roles',
            'delete roles',

            // organizations
            'view organizations',
            'edit organizations',

            // organizers (Admin oversight — no free edit of identity fields)
            'view organizers',
            'suspend organizers',
            'delete organizers',

            // packages (Admin full CRUD)
            'view packages',
            'create packages',
            'edit packages',
            'delete packages',

            // organizer subscriptions (Admin oversight — assign/cancel, not Web self-serve)
            'view organizer subscriptions',
            'assign organizer subscriptions',

            // events (Admin oversight)
            'view events',
            'create events',
            'edit events',
            'delete events',

            // event categories (Admin CRUD)
            'view event categories',
            'create event categories',
            'edit event categories',
            'delete event categories',

            // ticket types (Admin oversight — disable sales / soft-delete)
            'view ticket types',
            'create ticket types',
            'moderate ticket types',

            // discount codes (Admin read oversight)
            'view discount codes',
            'create discount codes',

            // participations (Admin oversight)
            'view participations',
            'manage participations',

            // settings
            'manage settings',


            // reports
            'view reports',

            // logs
            'view logs',

            // view dashboard
            "view dashboard",

            // view trash items
            "view trash items",
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Create roles and assign permissions

        // 1. Admin - can do everything
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $adminRole->syncPermissions(Permission::all());

        // Create sample users and assign roles
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password'),
                'user_type' => UserType::ADMIN,
            ]
        );
        if (! $adminUser->hasRole('admin')) {
            $adminUser->assignRole('admin');
        }
    }
}
