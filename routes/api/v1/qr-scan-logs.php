<?php

use App\Http\Controllers\Api\QrScanLogController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| QR Scan Logs API Routes (Admin oversight)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [QrScanLogController::class, 'index'])
        ->middleware('permission:view qr scan logs');
    Route::post('/validate', [QrScanLogController::class, 'validateScan'])
        ->middleware('permission:manage qr scans');
    Route::get('/{id}', [QrScanLogController::class, 'show'])
        ->middleware('permission:view qr scan logs');
});
