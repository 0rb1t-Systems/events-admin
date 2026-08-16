<?php

use App\Http\Controllers\Api\FeedbackController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Feedback API Routes (Admin platform content oversight)
|--------------------------------------------------------------------------
| Web App public/organizer feedback queries MUST filter where hidden = false.
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [FeedbackController::class, 'index'])
        ->middleware('permission:view event feedback');
    Route::get('/{id}', [FeedbackController::class, 'show'])
        ->middleware('permission:view event feedback');
    Route::patch('/{id}/visibility', [FeedbackController::class, 'updateVisibility'])
        ->middleware('permission:moderate feedback');
});
