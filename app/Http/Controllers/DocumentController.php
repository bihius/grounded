<?php

namespace App\Http\Controllers;

use App\Jobs\ChunkDocument;
use App\Models\Document;
use App\Services\DocumentChunker;
use Illuminate\Http\Request;
use Smalot\PdfParser\Parser;

class DocumentController extends Controller
{
    public function index()
    {
        return Document::all();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'source_url' => ['nullable', 'url'],
        ]);

        return Document::create($data);
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

        $document = Document::create($data);
        ChunkDocument::dispatch($document);

        return $document;
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
