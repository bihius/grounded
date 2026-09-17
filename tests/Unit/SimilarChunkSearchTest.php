<?php

namespace Tests\Unit;

use App\Services\EmbeddingGenerator;
use App\Services\SimilarChunkSearch;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class SimilarChunkSearchTest extends TestCase
{
    public function test_it_searches_chunks_by_query_embedding(): void
    {
        $embeddings = Mockery::mock(EmbeddingGenerator::class);
        $query = Mockery::mock(Builder::class);
        $embeddings->expects('generate')->with('How do ETFs work?')->andReturn([0.1, -0.2]);
        DB::shouldReceive('table')->once()->with('document_chunks')->andReturn($query);

        foreach (['join', 'whereNotNull', 'select', 'orderBy', 'limit'] as $method) {
            $query->shouldReceive($method)->andReturnSelf();
        }
        $query->shouldReceive('selectRaw')->once()->with(
            'document_chunks.embedding <=> ?::vector AS distance',
            ['[0.1,-0.2]']
        )->andReturnSelf();
        $query->shouldReceive('get')->once()->andReturn(new Collection);

        $results = (new SimilarChunkSearch($embeddings))->search('How do ETFs work?');

        $this->assertInstanceOf(Collection::class, $results);
    }
}
