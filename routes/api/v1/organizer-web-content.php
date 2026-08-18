<?php

use App\Http\Controllers\Api\Web\OrganizerAnalyticsController;
use App\Http\Controllers\Api\Web\OrganizerAnnouncementController;
use App\Http\Controllers\Api\Web\OrganizerFinanceController;
use App\Http\Controllers\Api\Web\OrganizerGalleryController;
use App\Http\Controllers\Api\Web\OrganizerParticipationController;
use App\Http\Controllers\Api\Web\OrganizerSessionController;
use App\Http\Controllers\Api\Web\OrganizerSpeakerController;
use App\Http\Controllers\Api\Web\OrganizerSponsorController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Organizer Web API — content, registrations, analytics, finance
|--------------------------------------------------------------------------
|
| Loaded from routes/api.php inside verify.api.client + /api/v1.
| Cross-organizer access returns 404. Envelope: { success, message, data, status_code }.
| Paginated lists: data.items + data.pagination.
|
*/

Route::middleware(['auth:sanctum', 'organizer.web'])->prefix('organizer')->group(function () {
    // Speakers
    Route::get('/events/{event}/speakers', [OrganizerSpeakerController::class, 'forEvent']);
    Route::post('/events/{event}/speakers', [OrganizerSpeakerController::class, 'storeForEvent']);
    Route::patch('/speakers/{speaker}', [OrganizerSpeakerController::class, 'update']);
    Route::delete('/speakers/{speaker}', [OrganizerSpeakerController::class, 'destroy']);

    // Sponsors
    Route::get('/events/{event}/sponsors', [OrganizerSponsorController::class, 'forEvent']);
    Route::post('/events/{event}/sponsors', [OrganizerSponsorController::class, 'storeForEvent']);
    Route::patch('/sponsors/{sponsor}', [OrganizerSponsorController::class, 'update']);
    Route::delete('/sponsors/{sponsor}', [OrganizerSponsorController::class, 'destroy']);

    // Sessions (no reorder — Admin EventAddOnController has none)
    Route::get('/events/{event}/sessions', [OrganizerSessionController::class, 'forEvent']);
    Route::post('/events/{event}/sessions', [OrganizerSessionController::class, 'storeForEvent']);
    Route::patch('/sessions/{session}', [OrganizerSessionController::class, 'update']);
    Route::delete('/sessions/{session}', [OrganizerSessionController::class, 'destroy']);

    // Gallery — multipart field name: `image` (see OrganizerGalleryController)
    Route::get('/events/{event}/images', [OrganizerGalleryController::class, 'forEvent']);
    Route::post('/events/{event}/images', [OrganizerGalleryController::class, 'storeForEvent']);
    Route::get('/events/{event}/images/{image}', [OrganizerGalleryController::class, 'showForEvent']);
    Route::delete('/events/{event}/images/{image}', [OrganizerGalleryController::class, 'destroyForEvent']);

    // Announcements
    Route::get('/events/{event}/announcements', [OrganizerAnnouncementController::class, 'forEvent']);
    Route::post('/events/{event}/announcements', [OrganizerAnnouncementController::class, 'storeForEvent']);

    // Participations
    Route::get('/events/{event}/participations', [OrganizerParticipationController::class, 'forEvent']);
    Route::get('/participations/{participation}', [OrganizerParticipationController::class, 'show']);
    Route::post('/participations/{participation}/promote', [OrganizerParticipationController::class, 'promote']);
    Route::post('/participations/{participation}/cancel', [OrganizerParticipationController::class, 'cancel']);

    // Analytics + finance (single owned event)
    Route::get('/events/{event}/analytics', [OrganizerAnalyticsController::class, 'show']);
    Route::get('/events/{event}/finance', [OrganizerFinanceController::class, 'show']);
});
