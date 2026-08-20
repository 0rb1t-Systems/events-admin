<?php

use App\Jobs\ExpireOrganizerSubscriptions;
use App\Jobs\ExpirePendingPayments;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Pending WaafiPay payments: expire after expires_at (default 15 min).
| Participation → cancelled, ticket quantity released — seats not held unpaid forever.
*/
Schedule::job(new ExpirePendingPayments)->everyFiveMinutes();
Schedule::job(new ExpireOrganizerSubscriptions)->everyFiveMinutes();
