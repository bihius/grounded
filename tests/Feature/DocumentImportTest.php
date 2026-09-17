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

    public function test_markdown_file_can_be_imported_as_a_document(): void
    {
        Queue::fake();
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
