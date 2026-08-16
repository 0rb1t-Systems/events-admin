<?php

use App\Http\Controllers\Api\LogController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Logs API Routes
|--------------------------------------------------------------------------
|
| Read-only activity log endpoints. All require view logs.
|
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [LogController::class, 'index'])->middleware('permission:view logs');
    Route::get('/types', [LogController::class, 'getLogTypes'])->middleware('permission:view logs');
    Route::get('/auth', [LogController::class, 'getAuthLogs'])->middleware('permission:view logs');
    Route::get('/users', [LogController::class, 'getUserLogs'])->middleware('permission:view logs');
    Route::get('/content', [LogController::class, 'getContentLogs'])->middleware('permission:view logs');
    Route::get('/stats', [LogController::class, 'getLogStats'])->middleware('permission:view logs');
    Route::get('/{id}', [LogController::class, 'show'])->middleware('permission:view logs');
});
