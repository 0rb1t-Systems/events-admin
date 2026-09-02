<?php

use App\Http\Controllers\Api\Web\OrganizerDashboardController;
use App\Http\Controllers\Api\Web\OrganizerDiscountCodeController;
use App\Http\Controllers\Api\Web\OrganizerEventController;
use App\Http\Controllers\Api\Web\OrganizerTicketTypeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Organizer Web App CORE (dashboard, events, ticket types, discount codes)
|--------------------------------------------------------------------------
|
| Require this file inside the v1 group with no extra prefix:
|   require base_path('routes/api/v1/organizer-web-core.php');
|
*/

Route::middleware(['auth:sanctum', 'organizer.web'])->prefix('organizer')->group(function () {
    Route::get('/dashboard', [OrganizerDashboardController::class, 'index']);

    Route::get('/events', [OrganizerEventController::class, 'index']);
    Route::post('/events', [OrganizerEventController::class, 'store']);
    Route::get('/events/{event}', [OrganizerEventController::class, 'show']);
    Route::patch('/events/{event}', [OrganizerEventController::class, 'update']);
    Route::delete('/events/{event}', [OrganizerEventController::class, 'destroy']);
    Route::post('/events/{event}/transition', [OrganizerEventController::class, 'transition']);
    Route::post('/events/{event}/banner', [OrganizerEventController::class, 'uploadBanner']);

    Route::get('/events/{event}/ticket-types', [OrganizerTicketTypeController::class, 'index']);
    Route::post('/events/{event}/ticket-types', [OrganizerTicketTypeController::class, 'store']);

    Route::get('/events/{event}/discount-codes', [OrganizerDiscountCodeController::class, 'index']);
    Route::post('/events/{event}/discount-codes', [OrganizerDiscountCodeController::class, 'store']);

    Route::patch('/ticket-types/{ticketType}/sales', [OrganizerTicketTypeController::class, 'updateSales']);
    Route::patch('/ticket-types/{ticketType}', [OrganizerTicketTypeController::class, 'update']);
    Route::delete('/ticket-types/{ticketType}', [OrganizerTicketTypeController::class, 'destroy']);

    Route::patch('/discount-codes/{discountCode}/active', [OrganizerDiscountCodeController::class, 'updateActive']);
    Route::patch('/discount-codes/{discountCode}', [OrganizerDiscountCodeController::class, 'update']);
    Route::delete('/discount-codes/{discountCode}', [OrganizerDiscountCodeController::class, 'destroy']);
});
