<?php

namespace Tests\Feature;

use App\Models\Document;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DocumentChunkingTest extends TestCase
{
    use RefreshDatabase;

    public function test_document_can_be_split_into_overlapping_chunks(): void
    {
        $content = str_repeat('0123456789', 60);
        $document = Document::create([
            'title' => 'Test document',
            'content' => $content,
        ]);

        $response = $this->postJson("/api/documents/{$document->id}/chunk");

        $response->assertOk();
        $this->assertDatabaseCount('document_chunks', 2);
        $this->assertDatabaseHas('document_chunks', [
            'document_id' => $document->id,
            'position' => 0,
            'content' => substr($content, 0, 500),
        ]);
        $this->assertDatabaseHas('document_chunks', [
            'document_id' => $document->id,
            'position' => 1,
            'content' => substr($content, 450, 150),
        ]);
    }
}
