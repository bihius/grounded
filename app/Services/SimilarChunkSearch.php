<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SimilarChunkSearch
{
    public function __construct(private EmbeddingGenerator $embeddings) {}

    public function search(string $question, int $limit = 5): Collection
    {
        $vector = '['.implode(',', $this->embeddings->generate($question)).']';

        return DB::table('document_chunks')
            ->join('documents', 'documents.id', '=', 'document_chunks.document_id')
            ->whereNotNull('document_chunks.embedding')
            ->select('document_chunks.content', 'document_chunks.position', 'document_chunks.document_id', 'documents.title')
            ->selectRaw('document_chunks.embedding <=> ?::vector AS distance', [$vector])
            ->orderBy('distance')
            ->limit($limit)
            ->get();
    }
}
