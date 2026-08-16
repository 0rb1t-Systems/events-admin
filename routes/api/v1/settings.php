<?php

use App\Http\Controllers\Api\SettingsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Settings API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register settings API routes for your application.
| These routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group and requires authentication.
|
*/

// All settings routes require authentication
Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {

    // Email Configuration Routes
    Route::prefix('mail-config')->group(function () {
        Route::get('/', [SettingsController::class, 'getMailConfig'])->middleware('permission:manage settings');
        Route::post('/', [SettingsController::class, 'updateMailConfig'])->middleware('permission:manage settings');
        Route::post('/test', [SettingsController::class, 'testMailConfig'])->middleware('permission:manage settings');
    });

    Route::get('/commission-rate', [SettingsController::class, 'getCommissionRate'])
        ->middleware('permission:manage settings');
    Route::put('/commission-rate', [SettingsController::class, 'updateCommissionRate'])
        ->middleware('permission:manage settings');
});
