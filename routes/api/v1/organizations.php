<?php

use App\Http\Controllers\Api\OrganizationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Organizations API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register organizations API routes for your application.
| These routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group and requires authentication.
|
*/

// All organization routes require authentication
Route::middleware('auth:sanctum')->group(function () {

    // Standard CRUD operations (adapted for single organization)
    Route::get('/', [OrganizationController::class, 'index'])->middleware('permission:view organizations');
    Route::post('/', [OrganizationController::class, 'store'])->middleware('permission:edit organizations');
    Route::get('/{id}', [OrganizationController::class, 'show'])->middleware('permission:view organizations');
    Route::patch('/{id}', [OrganizationController::class, 'update'])->middleware('permission:edit organizations');

    // Organization profile specific routes
    Route::get('/profile', [OrganizationController::class, 'getProfile'])->middleware('permission:view organizations');
    Route::post('/profile', [OrganizationController::class, 'updateProfile'])->middleware('permission:edit organizations');

    // Logo management routes
    Route::post('/logo', [OrganizationController::class, 'uploadLogo'])->middleware('permission:edit organizations');
    Route::delete('/logo', [OrganizationController::class, 'removeLogo'])->middleware('permission:edit organizations');

    // Dark logo management routes
    Route::post('/logo-dark', [OrganizationController::class, 'uploadDarkLogo'])->middleware('permission:edit organizations');
    Route::delete('/logo-dark', [OrganizationController::class, 'removeDarkLogo'])->middleware('permission:edit organizations');

    // Favicon/Icon management routes
    Route::post('/icon', [OrganizationController::class, 'uploadIcon'])->middleware('permission:edit organizations');
    Route::delete('/icon', [OrganizationController::class, 'removeIcon'])->middleware('permission:edit organizations');
});
