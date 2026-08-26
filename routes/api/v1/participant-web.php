<?php

use App\Http\Controllers\Api\Web\ParticipantDiscountController;
use App\Http\Controllers\Api\Web\ParticipantEventRoomController;
use App\Http\Controllers\Api\Web\ParticipantFeedbackController;
use App\Http\Controllers\Api\Web\ParticipantParticipationController;
use App\Http\Controllers\Api\Web\ParticipantPaymentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Participant Web API
|--------------------------------------------------------------------------
|
| Import from routes/api.php inside the v1 group (parent):
|
|   require base_path('routes/api/v1/participant-web.php');
|
| Middleware: auth:sanctum + participant.web (User + web-participant ability).
| Cross-user access returns 404 (notFoundResponse).
|
*/

Route::middleware(['auth:sanctum', 'participant.web'])->prefix('participant')->group(function () {
    Route::post('/events/{event}/discount-codes/validate', [ParticipantDiscountController::class, 'validateForEvent']);

    Route::get('/participations', [ParticipantParticipationController::class, 'index']);
    Route::post('/participations', [ParticipantParticipationController::class, 'store']);
    Route::get('/participations/{participation}', [ParticipantParticipationController::class, 'show']);
    Route::post('/participations/{participation}/cancel', [ParticipantParticipationController::class, 'cancel']);
    Route::get('/participations/{participation}/invitation', [ParticipantParticipationController::class, 'invitation']);
    Route::get('/participations/{participation}/certificate', [ParticipantParticipationController::class, 'certificate']);

    Route::get('/participations/{participation}/feedback', [ParticipantFeedbackController::class, 'show']);
    Route::post('/event-feedback', [ParticipantFeedbackController::class, 'store']);

    Route::get('/participations/{participation}/announcements', [ParticipantEventRoomController::class, 'announcements']);

    Route::get('/events/{event}/discussions', [ParticipantEventRoomController::class, 'listDiscussions']);
    Route::post('/events/{event}/discussions', [ParticipantEventRoomController::class, 'storeDiscussion']);
    Route::patch('/events/{event}/discussions/{discussion}', [ParticipantEventRoomController::class, 'updateDiscussion']);
    Route::delete('/events/{event}/discussions/{discussion}', [ParticipantEventRoomController::class, 'destroyDiscussion']);

    Route::post('/payments/charge', [ParticipantPaymentController::class, 'charge']);
});
