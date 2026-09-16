<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Request;

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
}
