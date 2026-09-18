import ChatPage from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';
import ReviewPage from './pages/ReviewPage';

const pages = [
    { path: '/', label: 'Czat', heading: 'Zapytaj bazę wiedzy', Page: ChatPage },
    { path: '/documents', label: 'Dokumenty', heading: 'Dokumenty bazy wiedzy', Page: DocumentsPage },
    { path: '/questions', label: 'Do uzupełnienia', heading: 'Pytania bez odpowiedzi', Page: ReviewPage },
];

export default function App() {
    const path = window.location.pathname.replace(/(.)\/$/, '$1');
    const current = pages.find((page) => page.path === path) ?? pages[0];
    const { Page } = current;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
                <header className="border-b border-slate-800 pb-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">Grounded</p>
                            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{current.heading}</h1>
                        </div>
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                            RAG online
                        </span>
                    </div>
                    <nav className="mt-5 flex gap-2">
                        {pages.map((page) => (
                            <a
                                key={page.path}
                                href={page.path}
                                aria-current={page === current ? 'page' : undefined}
                                className={page === current
                                    ? 'rounded-lg bg-cyan-400/10 px-3 py-1.5 text-sm font-semibold text-cyan-300'
                                    : 'rounded-lg px-3 py-1.5 text-sm text-slate-400 transition hover:text-slate-200'}
                            >
                                {page.label}
                            </a>
                        ))}
                    </nav>
                </header>

                <Page />
            </div>
        </main>
    );
}
