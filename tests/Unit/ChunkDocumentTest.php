<?php

namespace Tests\Unit;

use App\Jobs\ChunkDocument;
use App\Models\Document;
use App\Services\DocumentChunker;
use App\Services\EmbeddingGenerator;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class ChunkDocumentTest extends TestCase
{
    public function test_it_stores_an_embedding_for_each_chunk(): void
    {
        $document = new Document(['content' => 'Grounded document']);
        $chunk = (object) ['id' => 7, 'content' => 'Grounded chunk'];
        $chunker = Mockery::mock(DocumentChunker::class);
        $generator = Mockery::mock(EmbeddingGenerator::class);

        $chunker->expects('chunk')->with($document)->andReturn(collect([$chunk]));
        $generator->expects('generate')->with('Grounded chunk')->andReturn([0.1, -0.2]);
        DB::shouldReceive('table')->once()->with('document_chunks')->andReturnSelf();
        DB::shouldReceive('where')->once()->with('id', 7)->andReturnSelf();
        DB::shouldReceive('update')->once()->with([
            'embedding' => '[0.1,-0.2]',
        ])->andReturn(1);

        (new ChunkDocument($document))->handle($chunker, $generator);

        $this->addToAssertionCount(1);
    }
}
