<?php

namespace App\Http\Controllers;

use App\Jobs\ChunkDocument;
use App\Models\Document;
use App\Services\DocumentChunker;
use App\Services\SimilarChunkSearch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Smalot\PdfParser\Parser;
use Symfony\Component\DomCrawler\Crawler;

class DocumentController extends Controller
{
    public function index()
    {
        return Document::all();
    }

    public function search(Request $request, SimilarChunkSearch $search)
    {
        $data = $request->validate([
            'q' => ['required', 'string'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:20'],
        ]);

        return $search->search($data['q'], $data['limit'] ?? 5)
            ->map(fn ($chunk) => [
                'title' => $chunk->title,
                'document_id' => $chunk->document_id,
                'position' => $chunk->position,
                'distance' => $chunk->distance,
                'excerpt' => $chunk->content,
            ])
            ->values();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'source_url' => ['nullable', 'url'],
        ]);

        $data['indexing_status'] = 'queued';
        $document = Document::create($data);
        ChunkDocument::dispatch($document);

        return response()->json($document, 201);
    }

    public function importUrl(Request $request)
    {
        $data = $request->validate([
            'url' => ['required', 'url'],
            'title' => ['sometimes', 'string', 'max:255'],
        ]);
        $html = Http::timeout(20)->get($data['url'])->throw()->body();
        $crawler = new Crawler($html, $data['url']);
        $content = $crawler->filter('main')->count()
            ? $crawler->filter('main')->text('', true)
            : ($crawler->filter('article')->count()
                ? $crawler->filter('article')->text('', true)
                : $crawler->filter('body')->text('', true));
        $title = $data['title'] ?? $crawler->filter('title')->text('Untitled page', true);
        $document = Document::create([
            'title' => $title,
            'content' => $content,
            'source_url' => $data['url'],
            'indexing_status' => 'queued',
        ]);
        ChunkDocument::dispatch($document);

        return response()->json($document, 201);
    }

    public function import(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'mimes:md,markdown,txt,pdf'],
            'source_url' => ['nullable', 'url'],
        ]);

        $file = $request->file('file');
        $data['content'] = strtolower($file->getClientOriginalExtension()) === 'pdf'
            ? (new Parser)->parseFile($file->getRealPath())->getText()
            : $file->get();
        unset($data['file']);

        $data['indexing_status'] = 'queued';
        $document = Document::create($data);
        ChunkDocument::dispatch($document);

        return response()->json($document, 201);
    }

    public function update(Request $request, Document $document)
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'content' => ['sometimes', 'string'],
            'source_url' => ['sometimes', 'nullable', 'url'],
        ]);

        $document->update($data);

        return $document->refresh();
    }

    public function destroy(Document $document)
    {
        $document->delete();

        return response()->noContent();
    }

    public function chunk(Document $document, DocumentChunker $chunker)
    {
        return $chunker->chunk($document);
    }
}
