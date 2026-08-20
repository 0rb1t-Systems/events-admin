<?php

use App\Http\Controllers\Api\OrganizationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Organizations API Routes
|--------------------------------------------------------------------------
|
| Single-tenant organization profile for Admin Settings → Organization.
| Static paths (/profile, /logo, …) MUST be registered before /{id}.
|
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [OrganizationController::class, 'index'])->middleware('permission:view organizations');
    Route::post('/', [OrganizationController::class, 'store'])->middleware('permission:edit organizations');

    // Static paths before /{id}
    Route::get('/profile', [OrganizationController::class, 'getProfile'])->middleware('permission:view organizations');
    Route::post('/profile', [OrganizationController::class, 'updateProfile'])->middleware('permission:edit organizations');

    Route::post('/logo', [OrganizationController::class, 'uploadLogo'])->middleware('permission:edit organizations');
    Route::delete('/logo', [OrganizationController::class, 'removeLogo'])->middleware('permission:edit organizations');

    Route::post('/logo-dark', [OrganizationController::class, 'uploadDarkLogo'])->middleware('permission:edit organizations');
    Route::delete('/logo-dark', [OrganizationController::class, 'removeDarkLogo'])->middleware('permission:edit organizations');

    Route::post('/icon', [OrganizationController::class, 'uploadIcon'])->middleware('permission:edit organizations');
    Route::delete('/icon', [OrganizationController::class, 'removeIcon'])->middleware('permission:edit organizations');

    Route::get('/{id}', [OrganizationController::class, 'show'])->middleware('permission:view organizations');
    Route::patch('/{id}', [OrganizationController::class, 'update'])->middleware('permission:edit organizations');
});
