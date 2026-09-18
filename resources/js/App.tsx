import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';

type Source = {
    title: string;
    document_id: number;
    position: number;
    distance: number;
    excerpt: string;
};

type Message = {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    questionId?: number;
    feedback?: 0 | 1;
};

type Document = {
    id: number;
    title: string;
    source_url?: string | null;
    indexing_status?: string;
    created_at: string;
};

type ReviewQuestion = {
    id: number;
    question: string;
    answer?: string | null;
    feedback?: string | null;
};

type StreamEvent =
    | { type: 'token'; content: string }
    | { type: 'answer'; content: string }
    | { type: 'done'; question_id: number; sources: Source[] };

function renderInlineMarkdown(text: string): ReactNode[] {
    return text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g).map((part, index) => {
        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={index} className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-cyan-200">{part.slice(1, -1)}</code>;
        }
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
            return <em key={index}>{part.slice(1, -1)}</em>;
        }
        return <span key={index}>{part}</span>;
    });
}

function MarkdownMessage({ content }: { content: string }) {
    return (
        <div className="space-y-4">
            {content.split(/\n\s*\n/).map((block, index) => {
                const lines = block.split('\n');
                const isList = lines.every((line) => /^\s*(\d+[.)]|[-*])\s+/.test(line));
                if (isList) {
                    const ordered = /^\s*\d+[.)]/.test(lines[0]);
                    const List = ordered ? 'ol' : 'ul';
                    return (
                        <List key={index} className={ordered ? 'list-decimal space-y-2 pl-6' : 'list-disc space-y-2 pl-6'}>
                            {lines.map((line, lineIndex) => <li key={lineIndex}>{renderInlineMarkdown(line.replace(/^\s*(\d+[.)]|[-*])\s+/, ''))}</li>)}
                        </List>
                    );
                }

                if (/^#{1,6}\s/.test(block)) {
                    return <h3 key={index} className="text-lg font-semibold text-slate-200">{renderInlineMarkdown(block.replace(/^#{1,6}\s+/, ''))}</h3>;
                }

                return <p key={index} className="whitespace-pre-wrap">{renderInlineMarkdown(block)}</p>;
            })}
        </div>
    );
}

export default function App() {
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
    const [resolvingQuestion, setResolvingQuestion] = useState<number | null>(null);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        fetch('/api/questions?status=needs_review')
            .then((response) => response.json())
            .then(setReviewQuestions)
            .catch(() => setError('Nie udało się pobrać pytań do uzupełnienia.'));
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function uploadDocument(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const file = (form.elements.namedItem('file') as HTMLInputElement).files?.[0];
        if (!file || isUploading) return;

        const data = new FormData();
        data.append('title', title.trim() || file.name);
        data.append('file', file);
        setError('');
        setIsUploading(true);

        try {
            const response = await fetch('/api/documents/import', { method: 'POST', body: data });
            if (!response.ok) throw new Error('Nie udało się przesłać dokumentu.');
            const document = await response.json() as Document;
            setDocuments((current) => [document, ...current]);
            setTitle('');
            form.reset();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Wystąpił nieznany błąd.');
        } finally {
            setIsUploading(false);
        }
    }

    async function resolveQuestion(questionId: number, event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setResolvingQuestion(questionId);
        setError('');

        try {
            const response = await fetch(`/api/questions/${questionId}/resolve`, {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: data.get('title'),
                    content: data.get('content'),
                }),
            });
            if (!response.ok) throw new Error('Nie udało się zapisać odpowiedzi.');
            setReviewQuestions((current) => current.filter((question) => question.id !== questionId));
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Wystąpił nieznany błąd.');
        } finally {
            setResolvingQuestion(null);
        }
    }

    async function importUrl(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const value = url.trim();
        if (!value || isUploading) return;

        setError('');
        setIsUploading(true);
        try {
            const response = await fetch('/api/documents/import-url', {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: value, title: title.trim() || undefined }),
            });
            if (!response.ok) throw new Error('Nie udało się pobrać strony.');
            const document = await response.json() as Document;
            setDocuments((current) => [document, ...current]);
            setUrl('');
            setTitle('');
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Wystąpił nieznany błąd.');
        } finally {
            setIsUploading(false);
        }
    }

    async function askQuestion(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const text = question.trim();
        if (!text || isLoading) return;

        const assistantId = Date.now() + 1;
        setQuestion('');
        setError('');
        setIsLoading(true);
        setMessages((current) => [
            ...current,
            { id: Date.now(), role: 'user', content: text },
            { id: assistantId, role: 'assistant', content: '', sources: [] },
        ]);

        try {
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    Accept: 'text/event-stream',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question: text, limit: 3 }),
            });

            if (!response.ok || !response.body) {
                throw new Error('Nie udało się połączyć z API czatu.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                buffer += decoder.decode(value, { stream: !done });

                while (buffer.includes('\n\n')) {
                    const separator = buffer.indexOf('\n\n');
                    const event = buffer.slice(0, separator);
                    buffer = buffer.slice(separator + 2);
                    handleEvent(event, assistantId);
                }

                if (done) break;
            }
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Wystąpił nieznany błąd.');
        } finally {
            setIsLoading(false);
        }
    }

    async function sendFeedback(messageId: number, questionId: number, rating: 0 | 1) {
        const response = await fetch(`/api/questions/${questionId}/feedback`, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating }),
        });

        if (!response.ok) throw new Error('Nie udało się zapisać oceny.');
        setMessages((current) => current.map((message) =>
            message.id === messageId ? { ...message, feedback: rating } : message,
        ));
    }

    function handleEvent(event: string, assistantId: number) {
        const line = event.split('\n').find((item) => item.startsWith('data: '));
        if (!line) return;

        const payload = JSON.parse(line.slice(6)) as StreamEvent;
        if (payload.type === 'token' || payload.type === 'answer') {
            setMessages((current) => current.map((message) =>
                message.id === assistantId
                    ? { ...message, content: message.content + payload.content }
                    : message,
            ));
        }

        if (payload.type === 'done') {
            setMessages((current) => current.map((message) =>
                message.id === assistantId
                    ? { ...message, questionId: payload.question_id, sources: payload.sources }
                    : message,
            ));
        }
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
                <header className="flex items-center justify-between border-b border-slate-800 pb-5">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Grounded</p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Zapytaj bazę wiedzy</h1>
                    </div>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                        RAG online
                    </span>
                </header>

                <section className="border-b border-slate-800 py-6">
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
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="Tytuł dokumentu (opcjonalnie)"
                                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/60 sm:flex-1"
                            />
                            <input name="file" type="file" accept=".md,.markdown,.txt" required className="max-w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-slate-100" />
                            <button type="submit" disabled={isUploading} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">
                                {isUploading ? 'Wysyłam…' : 'Dodaj'}
                            </button>
                        </form>
                        <form onSubmit={importUrl} className="flex flex-col gap-2 sm:flex-row">
                            <input
                                type="url"
                                value={url}
                                onChange={(event) => setUrl(event.target.value)}
                                placeholder="https://example.com/artykul"
                                required
                                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/60 sm:flex-1"
                            />
                            <button type="submit" disabled={isUploading} className="rounded-lg border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">
                                {isUploading ? 'Pobieram…' : 'Dodaj URL'}
                            </button>
                        </form>
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

                {reviewQuestions.length > 0 && (
                    <section className="border-b border-amber-400/20 py-6">
                        <div className="mx-auto max-w-3xl">
                            <h2 className="text-lg font-semibold text-amber-200">Pytania do uzupełnienia</h2>
                            <p className="mt-1 text-sm text-slate-400">Odpowiedzi dodane tutaj staną się nowymi dokumentami w bazie wiedzy.</p>
                            <div className="mt-4 space-y-4">
                                {reviewQuestions.map((reviewQuestion) => (
                                    <form key={reviewQuestion.id} onSubmit={(event) => resolveQuestion(reviewQuestion.id, event)} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                                        <p className="font-medium text-slate-200">{reviewQuestion.question}</p>
                                        {reviewQuestion.feedback && <p className="mt-2 text-sm text-amber-200">Feedback: {reviewQuestion.feedback}</p>}
                                        <input name="title" required placeholder="Tytuł nowego dokumentu" className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/60" />
                                        <textarea name="content" required rows={4} placeholder="Treść odpowiedzi, która ma trafić do bazy wiedzy" className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-400/60" />
                                        <button type="submit" disabled={resolvingQuestion === reviewQuestion.id} className="mt-2 rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">
                                            {resolvingQuestion === reviewQuestion.id ? 'Zapisuję…' : 'Dodaj do bazy wiedzy'}
                                        </button>
                                    </form>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <section className="flex-1 py-8">
                    {messages.length === 0 ? (
                        <div className="mx-auto max-w-2xl py-20 text-center">
                            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 text-3xl text-cyan-300">
                                ✦
                            </div>
                            <h2 className="text-3xl font-semibold">Czego chcesz się dowiedzieć?</h2>
                            <p className="mt-3 text-slate-400">
                                Odpowiedź zostanie zbudowana na podstawie dokumentów zapisanych w bazie wiedzy.
                            </p>
                        </div>
                    ) : (
                        <div className="mx-auto max-w-3xl space-y-8">
                            {messages.map((message) => (
                                <article key={message.id} className={message.role === 'user' ? 'flex justify-end' : ''}>
                                    <div className={message.role === 'user' ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-cyan-500 px-5 py-3 text-slate-950' : 'max-w-[95%]'}>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            {message.role === 'user' ? 'Ty' : 'Grounded'}
                                        </p>
                                        <div className="leading-7">{message.content ? <MarkdownMessage content={message.content} /> : (isLoading ? 'Szukam informacji i generuję odpowiedź…' : '')}</div>
                                        {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                                            <div className="mt-6 border-t border-slate-800 pt-4">
                                                <h3 className="mb-3 text-sm font-semibold text-slate-300">Źródła</h3>
                                                <div className="space-y-3">
                                                    {message.sources.map((source) => (
                                                        <div key={`${source.document_id}-${source.position}`} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <span className="font-medium text-cyan-300">{source.title}</span>
                                                                <span className="text-xs text-slate-500">chunk {source.position} · dystans {source.distance.toFixed(3)}</span>
                                                            </div>
                                                            <div className="mt-2 text-sm leading-6 text-slate-400"><MarkdownMessage content={source.excerpt} /></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {message.role === 'assistant' && message.questionId && (
                                            <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                                                <span>Odpowiedź była pomocna?</span>
                                                <button
                                                    type="button"
                                                    disabled={message.feedback !== undefined}
                                                    onClick={() => sendFeedback(message.id, message.questionId!, 1).catch((caught) => setError(caught instanceof Error ? caught.message : 'Wystąpił nieznany błąd.'))}
                                                    className="rounded-lg border border-slate-700 px-2 py-1 transition hover:border-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    👍
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={message.feedback !== undefined}
                                                    onClick={() => sendFeedback(message.id, message.questionId!, 0).catch((caught) => setError(caught instanceof Error ? caught.message : 'Wystąpił nieznany błąd.'))}
                                                    className="rounded-lg border border-slate-700 px-2 py-1 transition hover:border-rose-400 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    👎
                                                </button>
                                                {message.feedback !== undefined && <span className="text-slate-500">Dziękuję za ocenę.</span>}
                                            </div>
                                        )}
                                    </div>
                                </article>
                            ))}
                            <div ref={bottomRef} />
                        </div>
                    )}
                </section>

                {error && <p className="mb-3 text-center text-sm text-rose-300">{error}</p>}

                <form onSubmit={askQuestion} className="mx-auto w-full max-w-3xl">
                    <div className="flex items-end gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-3 shadow-2xl shadow-cyan-950/20 focus-within:border-cyan-400/60">
                        <textarea
                            value={question}
                            onChange={(event) => setQuestion(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    event.currentTarget.form?.requestSubmit();
                                }
                            }}
                            placeholder="Np. Czym jest ETF?"
                            rows={2}
                            disabled={isLoading}
                            className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-500 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !question.trim()}
                            className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {isLoading ? 'Generuję…' : 'Zapytaj'}
                        </button>
                    </div>
                    <p className="mt-2 text-center text-xs text-slate-600">Enter wysyła pytanie · Shift + Enter dodaje nową linię</p>
                </form>
            </div>
        </main>
    );
}
