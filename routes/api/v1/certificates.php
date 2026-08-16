<?php

use App\Http\Controllers\Api\CertificateController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Certificates API Routes (Admin list + re-issue)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [CertificateController::class, 'index'])
        ->middleware('permission:view certificates');
    Route::get('/{id}', [CertificateController::class, 'show'])
        ->middleware('permission:view certificates');
    Route::post('/{participation_id}/reissue', [CertificateController::class, 'reissue'])
        ->middleware('permission:reissue certificates');
});
