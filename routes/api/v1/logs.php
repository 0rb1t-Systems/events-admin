<?php

use App\Http\Controllers\Api\LogController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Logs API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register logs API routes for your application.
| These routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group and requires authentication.
|
*/

// All log routes require authentication
Route::middleware('auth:sanctum')->group(function () {
    // Log Routes
    Route::get('/', [LogController::class, 'index']);//->middleware('permission:view logs');
    Route::get('/types', [LogController::class, 'getLogTypes']);//->middleware('permission:view logs');
    Route::get('/auth', [LogController::class, 'getAuthLogs']);//->middleware('permission:view logs');
    Route::get('/users', [LogController::class, 'getUserLogs']);//->middleware('permission:view logs');
    Route::get('/content', [LogController::class, 'getContentLogs']);//->middleware('permission:view logs');
    Route::get('/stats', [LogController::class, 'getLogStats']);//->middleware('permission:view logs');
    Route::get('/{id}', [LogController::class, 'show']);//->middleware('permission:view logs');
});
