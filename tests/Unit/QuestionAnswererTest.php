<?php

namespace Tests\Unit;

use App\Services\QuestionAnswerer;
use App\Services\SimilarChunkSearch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class QuestionAnswererTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_answers_a_question_using_search_results(): void
    {
        config([
            'services.ollama.url' => 'http://ollama.test',
            'services.ollama.chat_model' => 'qwen3:8b',
        ]);
        $search = Mockery::mock(SimilarChunkSearch::class);
        $search->expects('search')->with('What is an ETF?', 5)->andReturn(collect([
            (object) [
                'title' => 'ETF guide',
                'content' => 'An ETF tracks an index.',
                'document_id' => 3,
                'position' => 2,
                'distance' => 0.2,
            ],
        ]));
        Http::fake([
            'http://ollama.test/api/generate' => Http::response([
                'response' => 'An ETF tracks an index. [ETF guide]',
            ]),
        ]);

        $result = (new QuestionAnswerer($search))->answer('What is an ETF?');

        $this->assertSame('An ETF tracks an index. [ETF guide]', $result['answer']);
        $this->assertDatabaseHas('questions', [
            'question' => 'What is an ETF?',
            'answer' => 'An ETF tracks an index. [ETF guide]',
            'status' => 'answered',
        ]);
        $this->assertSame('ETF guide', $result['sources'][0]['title']);
        $this->assertSame('An ETF tracks an index.', $result['sources'][0]['excerpt']);
        Http::assertSent(fn ($request) => str_contains($request['prompt'], 'An ETF tracks an index.')
            && $request['model'] === 'qwen3:8b'
            && $request['stream'] === false);
    }

    public function test_it_keeps_every_retrieved_chunk_when_the_closest_one_is_relevant(): void
    {
        config([
            'services.ollama.url' => 'http://ollama.test',
            'services.rag.max_distance' => 0.6,
        ]);
        $search = Mockery::mock(SimilarChunkSearch::class);
        $search->expects('search')->with('What is an ETF?', 3)->andReturn(collect([
            (object) ['title' => 'ETF guide', 'content' => 'A', 'document_id' => 3, 'position' => 1, 'distance' => 0.45],
            (object) ['title' => 'ETF guide', 'content' => 'B', 'document_id' => 3, 'position' => 2, 'distance' => 0.58],
            (object) ['title' => 'ETF guide', 'content' => 'C', 'document_id' => 3, 'position' => 3, 'distance' => 0.71],
        ]));
        Http::fake([
            'http://ollama.test/api/generate' => Http::response(['response' => 'An ETF tracks an index.']),
        ]);

        $result = (new QuestionAnswerer($search))->answer('What is an ETF?', 3);

        $this->assertCount(3, $result['sources']);
    }

    public function test_it_says_it_does_not_know_when_chunks_are_too_distant(): void
    {
        config(['services.rag.max_distance' => 0.6]);
        $search = Mockery::mock(SimilarChunkSearch::class);
        $search->expects('search')->with('What is Kubernetes?', 5)->andReturn(collect([
            (object) ['distance' => 0.8],
            (object) ['distance' => 0.9],
        ]));
        Http::fake();

        $result = (new QuestionAnswerer($search))->answer('What is Kubernetes?');

        $this->assertSame(
            'Nie znalazłem wystarczająco podobnych informacji w bazie wiedzy.',
            $result['answer']
        );
        $this->assertSame([], $result['sources']);
        $this->assertDatabaseHas('questions', [
            'question' => 'What is Kubernetes?',
            'answer' => 'Nie znalazłem wystarczająco podobnych informacji w bazie wiedzy.',
            'status' => 'needs_review',
        ]);
        Http::assertNothingSent();
    }
}
