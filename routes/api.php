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

    // Profile routes
    Route::middleware('auth:sanctum')->put('/auth/profile', [\App\Http\Controllers\Api\AuthController::class, 'updateProfile']);
    Route::middleware('auth:sanctum')->post('/auth/profile-picture', [\App\Http\Controllers\Api\AuthController::class, 'updateProfilePicture']);
    Route::middleware('auth:sanctum')->post('/auth/change-password', [\App\Http\Controllers\Api\AuthController::class, 'changePassword']);
});
