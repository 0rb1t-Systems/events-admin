<?php

use Illuminate\Support\Facades\Route;

// Route::get('/', function () {
//     return view('welcome');
// });

Route::get('/', fn() => view('app'));

// Catch all routes and return the app view (except API routes)
Route::get('/{any}', fn() => view('app'))->where('any', '^(?!api).*$');