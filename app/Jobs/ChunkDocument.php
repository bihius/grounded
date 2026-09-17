<?php

namespace App\Jobs;

use App\Models\Document;
use App\Services\DocumentChunker;
use App\Services\EmbeddingGenerator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Throwable;

class ChunkDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Document $document) {}

    public function handle(DocumentChunker $chunker, EmbeddingGenerator $generator): void
    {
        $this->document->update(['indexing_status' => 'processing']);

        foreach ($chunker->chunk($this->document) as $chunk) {
            $embedding = $generator->generate($chunk->content);
            DB::table('document_chunks')->where('id', $chunk->id)->update([
                'embedding' => '['.implode(',', $embedding).']',
            ]);
        }

        $this->document->update(['indexing_status' => 'ready']);
    }

    public function failed(Throwable $exception): void
    {
        $this->document->update(['indexing_status' => 'failed']);
    }
}
