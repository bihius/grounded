<?php

namespace App\Http\Controllers;

use App\Jobs\ChunkDocument;
use App\Models\Document;
use App\Models\Question;
use Illuminate\Http\Request;

class QuestionController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->query('status');

        return Question::when($status, fn ($query) => $query->where('status', $status))
            ->latest()
            ->get();
    }

    public function resolve(Request $request, Question $question)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'source_url' => ['nullable', 'url'],
        ]);
        $document = Document::create([...$data, 'indexing_status' => 'queued']);
        ChunkDocument::dispatch($document);
        $question->update(['status' => 'resolved']);

        return ['question' => $question->refresh(), 'document' => $document];
    }

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
