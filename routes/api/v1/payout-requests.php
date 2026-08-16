<?php

use App\Http\Controllers\Api\PayoutRequestController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [PayoutRequestController::class, 'index'])
        ->middleware('permission:view payouts');
    Route::post('/', [PayoutRequestController::class, 'store'])
        ->middleware('permission:manage payouts');
    Route::get('/{id}', [PayoutRequestController::class, 'show'])
        ->middleware('permission:view payouts');
    Route::post('/{id}/approve', [PayoutRequestController::class, 'approve'])
        ->middleware('permission:manage payouts');
    Route::post('/{id}/reject', [PayoutRequestController::class, 'reject'])
        ->middleware('permission:manage payouts');
    Route::post('/{id}/record-payment', [PayoutRequestController::class, 'recordPayment'])
        ->middleware('permission:manage payouts');
});
