<?php

use Illuminate\Support\Facades\Route;

// Every page renders the same shell; the React app picks one by pathname.
Route::view('/', 'welcome');
Route::view('/documents', 'welcome');
Route::view('/questions', 'welcome');

Route::get('/hello', function () {
    return 'Hello from Laravel';
});

