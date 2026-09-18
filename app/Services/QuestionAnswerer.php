<?php

namespace App\Services;

use App\Models\Question;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class QuestionAnswerer
{
    public function __construct(private SimilarChunkSearch $search) {}

    public function stream(string $question, int $limit = 5): StreamedResponse
    {
        $questionRecord = Question::create(['question' => $question]);
        $chunks = $this->search->search($question, $limit)
            ->filter(fn ($chunk) => $chunk->distance <= config('services.rag.max_distance'))
            ->values();

        return response()->stream(function () use ($question, $questionRecord, $chunks): void {
            if ($chunks->isEmpty()) {
                $questionRecord->update([
                    'answer' => 'Nie znalazłem wystarczająco podobnych informacji w bazie wiedzy.',
                    'status' => 'needs_review',
                ]);
                echo 'data: '.json_encode(['type' => 'answer', 'content' => 'Nie znalazłem wystarczająco podobnych informacji w bazie wiedzy.'])."\n\n";
                echo 'data: '.json_encode([
                    'type' => 'done',
                    'question_id' => $questionRecord->id,
                    'sources' => [],
                ])."\n\n";

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
            $answer = '';
            $buffer = '';
            while (! $body->eof()) {
                $buffer .= $body->read(8192);

                while (($newline = strpos($buffer, "\n")) !== false) {
                    $line = trim(substr($buffer, 0, $newline));
                    $buffer = substr($buffer, $newline + 1);
                    $data = json_decode($line, true);
                    if (($data['response'] ?? '') !== '') {
                        $answer .= $data['response'];
                        echo 'data: '.json_encode(['type' => 'token', 'content' => $data['response']])."\n\n";
                        flush();
                    }
                }
            }

            $questionRecord->update(['answer' => $answer]);
            echo 'data: '.json_encode([
                'type' => 'done',
                'question_id' => $questionRecord->id,
                'sources' => $this->sources($chunks),
            ])."\n\n";
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    public function answer(string $question, int $limit = 5): array
    {
        $questionRecord = Question::create(['question' => $question]);
        $chunks = $this->search->search($question, $limit)
            ->filter(fn ($chunk) => $chunk->distance <= config('services.rag.max_distance'))
            ->values();

        if ($chunks->isEmpty()) {
            $answer = 'Nie znalazłem wystarczająco podobnych informacji w bazie wiedzy.';
            $questionRecord->update([
                'answer' => $answer,
                'status' => 'needs_review',
            ]);

            return [
                'answer' => $answer,
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

        $questionRecord->update(['answer' => $answer]);

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
