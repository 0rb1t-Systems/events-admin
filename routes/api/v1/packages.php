<?php

use App\Http\Controllers\Api\PackageController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Packages API Routes (Admin CRUD)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [PackageController::class, 'index'])->middleware('permission:view packages');
    Route::get('/search', [PackageController::class, 'search'])->middleware('permission:view packages');
    Route::post('/', [PackageController::class, 'store'])->middleware('permission:create packages');
    Route::get('/{id}', [PackageController::class, 'show'])->middleware('permission:view packages');
    Route::patch('/{id}', [PackageController::class, 'update'])->middleware('permission:edit packages');
    Route::delete('/{id}', [PackageController::class, 'destroy'])->middleware('permission:delete packages');
    Route::post('/{id}/archive', [PackageController::class, 'archive'])->middleware('permission:edit packages');
});
