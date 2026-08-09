<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Auth API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register auth API routes for your application.
| These routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Public routes (no authentication required)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/admin/login', [AuthController::class, 'adminLogin']);
Route::post('/google/login', [AuthController::class, 'googleLogin']);
Route::post('/verify', [AuthController::class, 'verify']);
Route::post('/resend-verification', [AuthController::class, 'resendVerification']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/check-token', [AuthController::class, 'checkToken']);

// Protected routes (authentication required)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Update FCM token
    Route::post('/update-fcm-token', [AuthController::class, 'updateFcmToken']);



    // Lock/Unlock routes
    Route::post('/lock', [AuthController::class, 'lock']);
    Route::post('/unlock', [AuthController::class, 'unlock']);
    Route::get('/check-lock', [AuthController::class, 'checkLock']);

    // Profile routes
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile-picture', [AuthController::class, 'updateProfilePicture']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
});
