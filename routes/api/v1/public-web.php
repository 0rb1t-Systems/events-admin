<?php

/*
|--------------------------------------------------------------------------
| Public Web API (catalog helpers)
|--------------------------------------------------------------------------
|
| GET /api/v1/events/{id}/form-fields is wired from routes/api/v1/events.php
| (public catalog, outside admin.panel — same group as GET /events and GET /events/{id}).
|
| Handler: App\Http\Controllers\Api\Web\PublicEventFormFieldController::show
| - API-key-only callers: active fields for public-catalog statuses; draft/cancelled/completed → 404
| - Admin-panel Bearer + permission `view event form fields`: full admin payload (incl. inactive)
|   via EventFormFieldController::forEvent
| - Admin-panel Bearer without that permission → 403
|
| Parent: keep the events.php registration (do not prefix-import this file):
|
|   Route::get('/{id}/form-fields', [
|       \App\Http\Controllers\Api\Web\PublicEventFormFieldController::class,
|       'show',
|   ]);
|
*/
