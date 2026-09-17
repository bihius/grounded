<?php

namespace Tests\Unit;

use App\Services\EmbeddingGenerator;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EmbeddingGeneratorTest extends TestCase
{
    public function test_it_generates_an_embedding_with_ollama(): void
    {
        config([
            'services.ollama.url' => 'http://ollama.test',
            'services.ollama.embedding_model' => 'bge-m3',
        ]);
        Http::fake([
            'http://ollama.test/api/embed' => Http::response([
                'embeddings' => [[0.1, -0.2, 0.3]],
            ]),
        ]);

        $embedding = app(EmbeddingGenerator::class)->generate('Grounded document');

        $this->assertSame([0.1, -0.2, 0.3], $embedding);
        Http::assertSent(function (Request $request): bool {
            return $request->url() === 'http://ollama.test/api/embed'
                && $request['model'] === 'bge-m3'
                && $request['input'] === 'Grounded document';
        });
    }
}
