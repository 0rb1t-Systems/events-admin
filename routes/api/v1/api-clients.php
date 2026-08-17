<?php

use App\Http\Controllers\Api\ApiClientController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Clients (read-only — seeded via .env / migrations)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [ApiClientController::class, 'index'])->middleware('permission:view api clients');
    Route::get('/{id}', [ApiClientController::class, 'show'])->middleware('permission:view api clients');
});
