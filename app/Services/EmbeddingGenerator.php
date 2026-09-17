<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class EmbeddingGenerator
{
    public function generate(string $text): array
    {
        return Http::baseUrl(config('services.ollama.url'))
            ->timeout(120)
            ->post('/api/embed', [
                'model' => config('services.ollama.embedding_model'),
                'input' => $text,
            ])
            ->throw()
            ->json('embeddings.0');
    }
}
