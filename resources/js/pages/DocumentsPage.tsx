import { FormEvent, useEffect, useState } from 'react';
import { Document } from '../types';

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [fileTitle, setFileTitle] = useState('');
    const [urlTitle, setUrlTitle] = useState('');
    const [url, setUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadDocuments = () => {
            fetch('/api/documents')
                .then((response) => response.json())
                .then(setDocuments)
                .catch(() => setError('Nie udało się pobrać listy dokumentów.'));
        };

        loadDocuments();
        const interval = window.setInterval(loadDocuments, 3000);

        return () => window.clearInterval(interval);
    }, []);

    async function uploadDocument(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const file = (form.elements.namedItem('file') as HTMLInputElement).files?.[0];
        if (!file || isUploading) return;

        const data = new FormData();
        data.append('title', fileTitle.trim() || file.name);
        data.append('file', file);
        setError('');
        setIsUploading(true);

        try {
            const response = await fetch('/api/documents/import', { method: 'POST', body: data });
            if (!response.ok) throw new Error('Nie udało się przesłać dokumentu.');
            const document = await response.json() as Document;
            setDocuments((current) => [document, ...current]);
            setFileTitle('');
            form.reset();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Wystąpił nieznany błąd.');
        } finally {
            setIsUploading(false);
        }
    }

    async function importUrl(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const value = url.trim();
        if (!value || isImporting) return;

        setError('');
        setIsImporting(true);
        try {
            const response = await fetch('/api/documents/import-url', {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: value, title: urlTitle.trim() || undefined }),
            });
            if (!response.ok) throw new Error('Nie udało się pobrać strony.');
            const document = await response.json() as Document;
            setDocuments((current) => [document, ...current]);
            setUrl('');
            setUrlTitle('');
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Wystąpił nieznany błąd.');
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <section className="flex-1 py-8">
            <div className="mx-auto max-w-3xl">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Dokumenty</h2>
                        <p className="mt-1 text-sm text-slate-400">Pliki, na których pracuje baza wiedzy.</p>
                    </div>
                    <span className="text-sm text-slate-500">{documents.length}</span>
                </div>

                <form onSubmit={uploadDocument} className="mb-5 flex flex-col gap-2 sm:flex-row">
                    <input
                        type="text"
                        value={fileTitle}
                        onChange={(event) => setFileTitle(event.target.value)}
                        placeholder="Tytuł dokumentu (opcjonalnie)"
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/60 sm:flex-1"
                    />
                    <input name="file" type="file" accept=".md,.markdown,.txt,.pdf" required className="max-w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-slate-100" />
                    <button type="submit" disabled={isUploading} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">
                        {isUploading ? 'Wysyłam…' : 'Dodaj'}
                    </button>
                </form>

                <form onSubmit={importUrl} className="mb-5 flex flex-col gap-2 sm:flex-row">
                    <input
                        type="text"
                        value={urlTitle}
                        onChange={(event) => setUrlTitle(event.target.value)}
                        placeholder="Tytuł strony (opcjonalnie)"
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/60 sm:flex-1"
                    />
                    <input
                        type="url"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder="https://example.com/artykul"
                        required
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/60 sm:flex-1"
                    />
                    <button type="submit" disabled={isImporting} className="rounded-lg border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">
                        {isImporting ? 'Pobieram…' : 'Dodaj URL'}
                    </button>
                </form>

                {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}

                {documents.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {documents.map((document) => (
                            <div key={document.id} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="truncate text-sm font-medium text-cyan-300">{document.title}</span>
                                    <span className="shrink-0 text-xs text-slate-500">{document.indexing_status ?? 'queued'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
