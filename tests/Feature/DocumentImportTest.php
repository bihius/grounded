<?php

namespace Tests\Feature;

use App\Jobs\ChunkDocument;
use App\Models\Document;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
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
        ]);
    }

    public function test_web_page_can_be_imported_as_a_document(): void
    {
        Http::fake([
            'https://example.test/guide' => Http::response(
                '<html><head><title>Web guide</title></head><body><nav>Menu</nav><main><h1>Grounded</h1><p>Web content.</p></main></body></html>'
            ),
        ]);

        $response = $this->postJson('/api/documents/import-url', [
            'url' => 'https://example.test/guide',
        ]);

        $response->assertCreated();
        Queue::assertPushed(ChunkDocument::class);
        $document = Document::firstWhere('source_url', 'https://example.test/guide');
        $this->assertSame('Web guide', $document->title);
        $this->assertStringContainsString('Grounded', $document->content);
        $this->assertStringContainsString('Web content.', $document->content);
        $this->assertStringNotContainsString('Menu', $document->content);
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
