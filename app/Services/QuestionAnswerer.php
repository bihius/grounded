<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class QuestionAnswerer
{
    public function __construct(private SimilarChunkSearch $search) {}

    public function stream(string $question, int $limit = 5): StreamedResponse
    {
        $chunks = $this->search->search($question, $limit)
            ->filter(fn ($chunk) => $chunk->distance <= config('services.rag.max_distance'))
            ->values();

        return response()->stream(function () use ($question, $chunks): void {
            if ($chunks->isEmpty()) {
                echo 'data: '.json_encode(['type' => 'answer', 'content' => 'Nie znalazłem wystarczająco podobnych informacji w bazie wiedzy.'])."\n\n";
                echo 'data: '.json_encode(['type' => 'done', 'sources' => []])."\n\n";

                return;
            }

            $context = $chunks->map(fn ($chunk) => "[{$chunk->title}]\n{$chunk->content}")->implode("\n\n");
            $prompt = "Answer the question using only the context below. Cite the document title in your answer.\n\n"
                ."Question: {$question}\n\nContext:\n{$context}";
            $response = Http::withOptions(['stream' => true])
                ->baseUrl(config('services.ollama.url'))
                ->timeout(120)
                ->post('/api/generate', [
                    'model' => config('services.ollama.chat_model'),
                    'prompt' => $prompt,
                    'stream' => true,
                ])
                ->throw();
            $body = $response->toPsrResponse()->getBody();

            $buffer = '';
            while (! $body->eof()) {
                $buffer .= $body->read(8192);

                while (($newline = strpos($buffer, "\n")) !== false) {
                    $line = trim(substr($buffer, 0, $newline));
                    $buffer = substr($buffer, $newline + 1);
                    $data = json_decode($line, true);
                    if (($data['response'] ?? '') !== '') {
                        echo 'data: '.json_encode(['type' => 'token', 'content' => $data['response']])."\n\n";
                        flush();
                    }
                }
            }

            echo 'data: '.json_encode(['type' => 'done', 'sources' => $this->sources($chunks)])."\n\n";
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    public function answer(string $question, int $limit = 5): array
    {
        $chunks = $this->search->search($question, $limit)
            ->filter(fn ($chunk) => $chunk->distance <= config('services.rag.max_distance'))
            ->values();

        if ($chunks->isEmpty()) {
            return [
                'answer' => 'Nie znalazłem wystarczająco podobnych informacji w bazie wiedzy.',
                'sources' => [],
            ];
        }

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
            'sources' => $this->sources($chunks),
        ];
    }

    private function sources(Collection $chunks): Collection
    {
        return $chunks->map(fn ($chunk) => [
            'title' => $chunk->title,
            'document_id' => $chunk->document_id,
            'position' => $chunk->position,
            'distance' => $chunk->distance,
            'excerpt' => Str::limit($chunk->content, 240),
        ])->values();
    }
}
