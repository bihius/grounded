<?php

namespace Tests\Unit;

use App\Services\QuestionAnswerer;
use App\Services\SimilarChunkSearch;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class QuestionAnswererTest extends TestCase
{
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
        $this->assertSame('ETF guide', $result['sources'][0]['title']);
        Http::assertSent(fn ($request) => str_contains($request['prompt'], 'An ETF tracks an index.')
            && $request['model'] === 'qwen3:8b'
            && $request['stream'] === false);
    }
}
