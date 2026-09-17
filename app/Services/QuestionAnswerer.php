<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class QuestionAnswerer
{
    public function __construct(private SimilarChunkSearch $search) {}

    public function answer(string $question, int $limit = 5): array
    {
        $chunks = $this->search->search($question, $limit);
        $context = $chunks->map(fn ($chunk) => "[{$chunk->title}]\n{$chunk->content}")->implode("\n\n");
        $prompt = "Answer the question using only the context below. Cite the document title in your answer.\n\n"
            ."Question: {$question}\n\nContext:\n{$context}";
        $answer = Http::baseUrl(config('services.ollama.url'))
            ->timeout(120)
            ->post('/api/generate', [
                'model' => config('services.ollama.chat_model'),
                'prompt' => $prompt,
                'stream' => false,
            ])
            ->throw()
            ->json('response');

        return [
            'answer' => $answer,
            'sources' => $chunks->map(fn ($chunk) => [
                'title' => $chunk->title,
                'document_id' => $chunk->document_id,
                'position' => $chunk->position,
                'distance' => $chunk->distance,
            ])->values(),
        ];
    }
}
