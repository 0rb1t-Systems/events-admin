<?php

use App\Http\Controllers\Api\PaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [PaymentController::class, 'index'])
        ->middleware('permission:view payments');
    Route::post('/charge', [PaymentController::class, 'charge'])
        ->middleware('permission:manage payments');
    Route::post('/manual', [PaymentController::class, 'recordManual'])
        ->middleware('permission:manage payments');
    Route::post('/{id}/refund', [PaymentController::class, 'refund'])
        ->middleware('permission:refund payments');
    Route::get('/{id}', [PaymentController::class, 'show'])
        ->middleware('permission:view payments');
});
