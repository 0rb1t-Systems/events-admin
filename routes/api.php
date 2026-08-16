<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json([
        'message' => 'API is working ✅',
        'time' => now(),
    ]);
});

// API Version 1 Routes
Route::prefix('v1')->group(function () {
    // Auth routes
    Route::prefix('auth')->group(base_path('routes/api/v1/auth.php'));

    // Settings routes
    Route::prefix('settings')->group(base_path('routes/api/v1/settings.php'));

    // Users routes
    Route::prefix('users')->group(base_path('routes/api/v1/users.php'));

    // Roles routes
    Route::prefix('roles')->group(base_path('routes/api/v1/roles.php'));

    // Logs routes
    Route::prefix('logs')->group(base_path('routes/api/v1/logs.php'));

    // Organizations routes
    Route::prefix('organizations')->group(base_path('routes/api/v1/organizations.php'));

    // Organizers (Admin oversight)
    Route::prefix('organizers')->group(base_path('routes/api/v1/organizers.php'));

    // Packages (Admin CRUD — subscription plans)
    Route::prefix('packages')->group(base_path('routes/api/v1/packages.php'));

    // Events (Admin oversight)
    Route::prefix('events')->group(base_path('routes/api/v1/events.php'));

    // Event categories (Admin CRUD)
    Route::prefix('event-categories')->group(base_path('routes/api/v1/event-categories.php'));

    // Ticket types + discount codes (admin oversight endpoints)
    require base_path('routes/api/v1/ticket-types.php');

    // Participations (admin oversight)
    require base_path('routes/api/v1/participations.php');

    // Organizer Web App auth scaffolding (separate from User auth)
    Route::prefix('organizer-auth')->group(base_path('routes/api/v1/organizer-auth.php'));

    // Profile routes (Admin Panel scoped)
    Route::middleware(['auth:sanctum', 'admin.panel'])->put('/auth/profile', [\App\Http\Controllers\Api\AuthController::class, 'updateProfile']);
    Route::middleware(['auth:sanctum', 'admin.panel'])->post('/auth/profile-picture', [\App\Http\Controllers\Api\AuthController::class, 'updateProfilePicture']);
    Route::middleware(['auth:sanctum', 'admin.panel'])->post('/auth/change-password', [\App\Http\Controllers\Api\AuthController::class, 'changePassword']);
});
