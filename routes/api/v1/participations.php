<?php

use App\Http\Controllers\Api\ParticipationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'admin.panel'])->prefix('participations')->group(function () {
    Route::get('/', [ParticipationController::class, 'index'])->middleware('permission:view participations');
    Route::post('/', [ParticipationController::class, 'store'])->middleware('permission:manage participations');
    Route::get('/{id}', [ParticipationController::class, 'show'])->middleware('permission:view participations');
    Route::post('/{id}/cancel', [ParticipationController::class, 'cancel'])->middleware('permission:manage participations');
});
