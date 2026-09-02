<?php

use App\Http\Controllers\Api\Web\PublicQrController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public door scanner (API-key only — scan_token is the gate credential)
|--------------------------------------------------------------------------
*/

Route::post('/scanner/unlock', [PublicQrController::class, 'unlockScanner']);
Route::post('/qr-scan-logs/validate', [PublicQrController::class, 'validateScan']);
Route::post('/scanner/events/{event}/qr-scan-logs', [PublicQrController::class, 'forEvent']);
