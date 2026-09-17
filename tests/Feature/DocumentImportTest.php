<?php

namespace Tests\Feature;

use App\Jobs\ChunkDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class DocumentImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_markdown_file_can_be_imported_as_a_document(): void
    {
        $content = "# Grounded\n\nTo jest dokument Markdown.";
        $file = UploadedFile::fake()->createWithContent('guide.md', $content);

        $response = $this->post('/api/documents/import', [
            'title' => 'Markdown guide',
            'file' => $file,
        ]);

        $response->assertCreated();
        Queue::assertPushed(ChunkDocument::class);
        $this->assertDatabaseHas('documents', [
            'title' => 'Markdown guide',
            'content' => $content,
            'indexing_status' => 'queued',
            'content_hash' => hash('sha256', $content),
        ]);
    }

    public function test_same_content_updates_existing_document(): void
    {
        $content = '# Grounded';

        $this->post('/api/documents/import', [
            'title' => 'Old title',
            'file' => UploadedFile::fake()->createWithContent('old.md', $content),
        ]);

        $response = $this->post('/api/documents/import', [
            'title' => 'New title',
            'file' => UploadedFile::fake()->createWithContent('new.txt', $content),
        ]);

        $response->assertOk()->assertJsonPath('title', 'New title');
        $this->assertDatabaseCount('documents', 1);
        $this->assertDatabaseHas('documents', [
            'title' => 'New title',
            'content_hash' => hash('sha256', $content),
        ]);
    }

    public function test_pdf_file_can_be_imported_as_a_document(): void
    {
        $pdf = file_get_contents(base_path('tests/Fixtures/guide.pdf'));
        $file = UploadedFile::fake()->createWithContent('guide.pdf', $pdf);

        $response = $this->post('/api/documents/import', [
            'title' => 'PDF guide',
            'file' => $file,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('documents', [
            'title' => 'PDF guide',
            'content' => 'Grounded PDF',
        ]);
    }
}
