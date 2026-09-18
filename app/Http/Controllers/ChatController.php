<?php

namespace App\Http\Controllers;

use App\Services\QuestionAnswerer;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function stream(Request $request, QuestionAnswerer $answerer)
    {
        $data = $request->validate([
            'question' => ['required', 'string'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:10'],
        ]);

        return $answerer->stream($data['question'], $data['limit'] ?? 5);
    }

    public function __invoke(Request $request, QuestionAnswerer $answerer)
    {
        $data = $request->validate([
            'question' => ['required', 'string'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:10'],
        ]);

        return $answerer->answer($data['question'], $data['limit'] ?? 5);
    }
}
