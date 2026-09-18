import { FormEvent, useEffect, useState } from 'react';
import { ReviewQuestion } from '../types';

export default function ReviewPage() {
    const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
    const [resolvingQuestion, setResolvingQuestion] = useState<number | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/questions?status=needs_review')
            .then((response) => response.json())
            .then(setReviewQuestions)
            .catch(() => setError('Nie udało się pobrać pytań do uzupełnienia.'));
    }, []);

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

    return (
        <section className="flex-1 py-8">
            <div className="mx-auto max-w-3xl">
                <h2 className="text-lg font-semibold text-amber-200">Pytania do uzupełnienia</h2>
                <p className="mt-1 text-sm text-slate-400">Odpowiedzi dodane tutaj staną się nowymi dokumentami w bazie wiedzy.</p>

                {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

                {reviewQuestions.length === 0 ? (
                    <p className="mt-10 text-center text-slate-500">Nie ma pytań czekających na uzupełnienie.</p>
                ) : (
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
                )}
            </div>
        </section>
    );
}
