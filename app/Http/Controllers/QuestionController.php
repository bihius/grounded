<?php

namespace App\Http\Controllers;

use App\Models\Question;
use Illuminate\Http\Request;

class QuestionController extends Controller
{
    public function feedback(Request $request, Question $question): Question
    {
        $data = $request->validate([
            'rating' => ['required', 'integer', 'in:0,1'],
            'feedback' => ['nullable', 'string', 'max:2000'],
        ]);

        $question->update([
            'rating' => $data['rating'],
            'feedback' => $data['feedback'] ?? null,
            'status' => $data['rating'] === 0 ? 'needs_review' : $question->status,
        ]);

        return $question->refresh();
    }
}
