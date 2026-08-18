<?php

use App\Http\Controllers\Api\OrganizerAuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Organizer Auth API (Web App scaffolding — no Admin UI)
|--------------------------------------------------------------------------
|
| Completely separate from /api/v1/auth (Users). Tokens use ability organizer-web.
|
*/

Route::post('/register', [OrganizerAuthController::class, 'register']);
Route::post('/login', [OrganizerAuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'organizer.web'])->group(function () {
    Route::post('/logout', [OrganizerAuthController::class, 'logout']);
    Route::get('/me', [OrganizerAuthController::class, 'me']);
    Route::patch('/profile', [OrganizerAuthController::class, 'updateProfile']);
    Route::post('/change-password', [OrganizerAuthController::class, 'changePassword']);
});
