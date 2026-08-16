<?php

use App\Http\Controllers\Api\DashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/stats', [DashboardController::class, 'stats'])
        ->middleware('permission:view dashboard');
});
