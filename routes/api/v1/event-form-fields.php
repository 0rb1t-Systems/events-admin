<?php

use App\Http\Controllers\Api\EventFormFieldController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Event Form Fields API Routes
| Admin: read-only oversight. Store/destroy for ops + tests (Web App owns authoring).
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [EventFormFieldController::class, 'index'])
        ->middleware('permission:view event form fields');
    Route::post('/', [EventFormFieldController::class, 'store'])
        ->middleware('permission:manage event form fields');
    Route::delete('/{id}', [EventFormFieldController::class, 'destroy'])
        ->middleware('permission:manage event form fields');
});
