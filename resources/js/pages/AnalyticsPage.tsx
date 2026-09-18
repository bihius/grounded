import { useEffect, useState } from 'react';
import { QuestionAnalytics } from '../types';

const tiles: { key: keyof QuestionAnalytics['summary']; label: string; tone: string }[] = [
    { key: 'total', label: 'Wszystkie pytania', tone: 'text-slate-100' },
    { key: 'answered', label: 'Odpowiedziane', tone: 'text-cyan-300' },
    { key: 'needs_review', label: 'Wymagają przeglądu', tone: 'text-amber-300' },
    { key: 'resolved', label: 'Rozwiązane', tone: 'text-emerald-300' },
    { key: 'positive_ratings', label: 'Oceny pozytywne', tone: 'text-emerald-300' },
    { key: 'negative_ratings', label: 'Oceny negatywne', tone: 'text-rose-300' },
    { key: 'unrated', label: 'Bez oceny', tone: 'text-slate-400' },
];

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<QuestionAnalytics | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/analytics/questions')
            .then((response) => response.json())
            .then(setAnalytics)
            .catch(() => setError('Nie udało się pobrać analityki pytań.'));
    }, []);

    if (error) {
        return <section className="flex-1 py-8"><p className="text-center text-sm text-rose-300">{error}</p></section>;
    }

    if (!analytics) {
        return <section className="flex-1 py-8"><p className="text-center text-slate-500">Wczytuję analitykę…</p></section>;
    }

    return (
        <section className="flex-1 py-8">
            <div className="mx-auto max-w-3xl space-y-8">
                <div>
                    <h2 className="text-lg font-semibold">Analityka pytań</h2>
                    <p className="mt-1 text-sm text-slate-400">O co pytają użytkownicy i gdzie baza wiedzy ma luki.</p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {tiles.map((tile) => (
                        <div key={tile.key} className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3">
                            <p className={`text-2xl font-semibold ${tile.tone}`}>{analytics.summary[tile.key]}</p>
                            <p className="mt-1 text-xs text-slate-400">{tile.label}</p>
                        </div>
                    ))}
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-slate-300">Najczęstsze pytania</h3>
                    {analytics.most_asked.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500">Nikt jeszcze o nic nie zapytał.</p>
                    ) : (
                        <ol className="mt-3 space-y-2">
                            {analytics.most_asked.map((item) => (
                                <li key={item.question} className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                                    <span className="text-sm text-slate-200">{item.question}</span>
                                    <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{item.count}×</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-slate-300">Podobne pytania</h3>
                    <p className="mt-1 text-xs text-slate-500">Pytania o to samo, zadane innymi słowami - grupowane po embeddingach.</p>
                    {analytics.similar_groups.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500">Nie znalazłem grup podobnych pytań.</p>
                    ) : (
                        <div className="mt-3 space-y-3">
                            {analytics.similar_groups.map((group) => (
                                <div key={group.questions[0].id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Podobnych pytań: {group.count}</p>
                                    <ul className="mt-2 space-y-1">
                                        {group.questions.map((question) => (
                                            <li key={question.id} className="text-sm text-slate-300">{question.question}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-amber-200">Czekają na uzupełnienie</h3>
                        <a href="/questions" className="text-sm text-cyan-300 transition hover:text-cyan-200">Przejdź do panelu →</a>
                    </div>
                    {analytics.needs_review.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500">Nie ma pytań czekających na uzupełnienie.</p>
                    ) : (
                        <ul className="mt-3 space-y-2">
                            {analytics.needs_review.map((question) => (
                                <li key={question.id} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
                                    {question.question}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}
