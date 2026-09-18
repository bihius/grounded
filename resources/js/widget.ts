/**
 * The embeddable chat widget.
 *
 * A host page pastes a single line:
 *
 *     <script src="https://grounded.example/widget.js" defer></script>
 *
 * It uses neither React nor Tailwind: the application bundle weighs ~290 kB and
 * would carry global styles that clash with the host page. The whole interface
 * lives in a shadow root, so styles are isolated in both directions.
 */

interface Source {
    title: string;
    position: number;
    distance: number;
    excerpt: string;
}

type StreamEvent =
    | { type: 'token' | 'answer'; content: string }
    | { type: 'done'; question_id: number; sources: Source[] };

const script = document.currentScript as HTMLScriptElement;
const api = script.dataset.api ?? new URL(script.src).origin;
const title = script.dataset.title ?? 'Zapytaj bazę wiedzy';
const accent = script.dataset.accent ?? '#22d3ee';

const styles = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, sans-serif; }

    .launcher {
        position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
        height: 56px; width: 56px; border: 0; border-radius: 50%;
        background: ${accent}; color: #020617; font-size: 24px; cursor: pointer;
        box-shadow: 0 10px 30px rgba(0, 0, 0, .35);
    }

    .panel {
        position: fixed; right: 20px; bottom: 88px; z-index: 2147483000;
        display: none; flex-direction: column;
        width: min(380px, calc(100vw - 40px)); height: min(560px, calc(100vh - 130px));
        border-radius: 16px; overflow: hidden; background: #0f172a; color: #e2e8f0;
        box-shadow: 0 20px 50px rgba(0, 0, 0, .45);
    }
    .panel[data-open="true"] { display: flex; }

    header { padding: 14px 16px; background: #1e293b; font-weight: 600; font-size: 15px; }

    .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .empty { margin: auto; text-align: center; color: #64748b; font-size: 14px; line-height: 1.5; }

    .message { max-width: 85%; padding: 10px 13px; border-radius: 14px; font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
    .message.user { align-self: flex-end; background: ${accent}; color: #020617; }
    .message.assistant { align-self: flex-start; background: #1e293b; }

    .sources { margin-top: 10px; padding-top: 10px; border-top: 1px solid #334155; font-size: 12px; color: #94a3b8; }
    .sources strong { display: block; margin-bottom: 6px; color: #cbd5e1; }
    .sources li { margin-bottom: 4px; }

    form { display: flex; gap: 8px; padding: 12px; background: #1e293b; }
    input { flex: 1; padding: 10px 12px; border: 1px solid #334155; border-radius: 10px; background: #0f172a; color: inherit; font-size: 14px; }
    input:focus { outline: none; border-color: ${accent}; }
    button[type="submit"] { padding: 0 16px; border: 0; border-radius: 10px; background: ${accent}; color: #020617; font-weight: 600; cursor: pointer; }
    button[type="submit"]:disabled { opacity: .4; cursor: not-allowed; }
`;

const host = document.createElement('div');
const root = host.attachShadow({ mode: 'open' });
root.innerHTML = `
    <style>${styles}</style>
    <button class="launcher" type="button" aria-label="${title}">✦</button>
    <section class="panel" data-open="false">
        <header>${title}</header>
        <div class="messages"><p class="empty">Zadaj pytanie - odpowiem na podstawie dokumentów z bazy wiedzy.</p></div>
        <form>
            <input name="question" placeholder="Np. Czym jest ETF?" autocomplete="off" required>
            <button type="submit">Wyślij</button>
        </form>
    </section>
`;
document.body.append(host);

const launcher = root.querySelector('.launcher') as HTMLButtonElement;
const panel = root.querySelector('.panel') as HTMLElement;
const messages = root.querySelector('.messages') as HTMLElement;
const form = root.querySelector('form') as HTMLFormElement;
const input = form.elements.namedItem('question') as HTMLInputElement;
const submit = form.querySelector('button') as HTMLButtonElement;

launcher.addEventListener('click', () => {
    const open = panel.dataset.open !== 'true';
    panel.dataset.open = String(open);
    if (open) input.focus();
});

function addMessage(role: 'user' | 'assistant', text = ''): HTMLElement {
    root.querySelector('.empty')?.remove();
    const message = document.createElement('div');
    message.className = `message ${role}`;
    message.textContent = text;
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;

    return message;
}

function addSources(message: HTMLElement, sources: Source[]): void {
    if (sources.length === 0) return;

    const list = document.createElement('ul');
    list.className = 'sources';
    list.innerHTML = `<strong>Źródła</strong>${sources
        .map((source) => `<li>${source.title} - fragment ${source.position}</li>`)
        .join('')}`;
    message.append(list);
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || submit.disabled) return;

    addMessage('user', question);
    const answer = addMessage('assistant', 'Szukam…');
    input.value = '';
    submit.disabled = true;

    try {
        const response = await fetch(`${api}/api/chat/stream`, {
            method: 'POST',
            headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, limit: 3 }),
        });
        if (!response.ok || !response.body) throw new Error('Nie udało się połączyć z asystentem.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let text = '';

        while (true) {
            const { value, done } = await reader.read();
            buffer += decoder.decode(value, { stream: !done });

            // SSE events are separated by a blank line; the last chunk may be partial.
            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';

            for (const event of events) {
                const line = event.split('\n').find((item) => item.startsWith('data: '));
                if (!line) continue;

                const payload = JSON.parse(line.slice(6)) as StreamEvent;
                if (payload.type === 'token' || payload.type === 'answer') {
                    text += payload.content;
                    answer.textContent = text;
                }
                if (payload.type === 'done') {
                    answer.textContent = text;
                    addSources(answer, payload.sources);
                }
                messages.scrollTop = messages.scrollHeight;
            }

            if (done) break;
        }
    } catch (caught) {
        answer.textContent = caught instanceof Error ? caught.message : 'Wystąpił nieznany błąd.';
    } finally {
        submit.disabled = false;
    }
});
