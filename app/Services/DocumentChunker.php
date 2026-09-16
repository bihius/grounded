<?php

namespace App\Services;

use App\Models\Document;
use Illuminate\Support\Collection;

class DocumentChunker
{
    public function chunk(Document $document, int $size = 500, int $overlap = 50): Collection
    {
        $document->chunks()->delete();
        $chunks = collect();
        $step = $size - $overlap;
        $length = mb_strlen($document->content);

        for ($offset = 0, $position = 0; $offset < $length; $offset += $step, $position++) {
            $chunks->push($document->chunks()->create([
                'content' => mb_substr($document->content, $offset, $size),
                'position' => $position,
            ]));
        }

        return $chunks;
    }
}
