import { FormEvent, useEffect, useRef, useState } from 'react';

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
};

type StreamEvent =
    | { type: 'token'; content: string }
    | { type: 'answer'; content: string }
    | { type: 'done'; sources: Source[] };

export default function App() {
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
                    ? { ...message, sources: payload.sources }
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
                                        <div className="whitespace-pre-wrap leading-7">{message.content || (isLoading ? 'Szukam informacji i generuję odpowiedź…' : '')}</div>
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
                                                            <p className="mt-2 text-sm leading-6 text-slate-400">{source.excerpt}</p>
                                                        </div>
                                                    ))}
                                                </div>
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
