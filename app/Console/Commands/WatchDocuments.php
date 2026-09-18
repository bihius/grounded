<?php

namespace App\Console\Commands;

use App\Jobs\ChunkDocument;
use App\Models\Document;
use Illuminate\Console\Command;
use Smalot\PdfParser\Parser;

class WatchDocuments extends Command
{
    protected $signature = 'documents:watch {--once} {--interval=5}';

    protected $description = 'Import documents from the inbox directory';

    public function handle(): int
    {
        $directory = storage_path('app/inbox');
        $this->ensureDirectory($directory);

        do {
            $this->scan($directory);

            if (! $this->option('once')) {
                sleep((int) $this->option('interval'));
            }
        } while (! $this->option('once'));

        return self::SUCCESS;
    }

    private function scan(string $directory): void
    {
        foreach (glob($directory.'/*') ?: [] as $path) {
            if (! is_file($path) || ! in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), ['md', 'markdown', 'txt', 'pdf'], true)) {
                continue;
            }

            $content = strtolower(pathinfo($path, PATHINFO_EXTENSION)) === 'pdf'
                ? (new Parser)->parseFile($path)->getText()
                : file_get_contents($path);
            $hash = hash('sha256', $content);

            if (Document::where('content_hash', $hash)->exists()) {
                continue;
            }

            $document = Document::create([
                'title' => pathinfo($path, PATHINFO_FILENAME),
                'content' => $content,
                'content_hash' => $hash,
                'indexing_status' => 'queued',
            ]);

            ChunkDocument::dispatch($document);
            $this->info("Queued {$document->title}");
        }
    }

    private function ensureDirectory(string $directory): void
    {
        if (! is_dir($directory)) {
            mkdir($directory, 0777, true);
        }
    }
}
