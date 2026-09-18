<?php

use App\Http\Controllers\ChatController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\QuestionController;
use Illuminate\Support\Facades\Route;

Route::get('/documents', [DocumentController::class, 'index']);
Route::get('/search', [DocumentController::class, 'search']);
Route::post('/chat', ChatController::class);
Route::post('/chat/stream', [ChatController::class, 'stream']);
Route::post('/questions/{question}/feedback', [QuestionController::class, 'feedback']);
Route::post('/documents', [DocumentController::class, 'store']);
Route::post('/documents/import', [DocumentController::class, 'import']);
Route::match(['put', 'patch'], '/documents/{document}', [DocumentController::class, 'update']);
Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
Route::post('/documents/{document}/chunk', [DocumentController::class, 'chunk']);
