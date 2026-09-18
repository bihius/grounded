<?php

use Illuminate\Support\Facades\Route;

// Every page renders the same shell; the React app picks one by pathname.
Route::view('/', 'welcome');
Route::view('/documents', 'welcome');
Route::view('/questions', 'welcome');

// A preview of the widget embedded on a page outside the application.
Route::view('/widget-demo', 'widget-demo');

Route::get('/hello', function () {
    return 'Hello from Laravel';
});

