# Grounded

A FAQ assistant that answers questions from documents you upload, cites the fragments it used,
and says "I don't know" when the knowledge base has nothing close enough. Laravel + Ollama +
pgvector, runs entirely on your own machine.

![Answer with cited sources, and a refusal for an off-topic question](docs/screenshots/chat-answer-with-sources.png)

*Both cases in one view: an answer with its sources and their cosine distances, and a question
the documents do not cover. The knowledge base here was built from public pages of a university
website as a demo corpus; the project is not affiliated with it.*

**This is a learning project** — built step by step to understand how a Laravel application is
put together and how retrieval-augmented generation works with nothing hidden behind a
framework. It has never run anywhere but a laptop.

## How it works

```
upload / URL / API ──▶ documents ──▶ ChunkDocument (Redis job)
                                            │ 500 chars, 50 overlap
                                            ▼
                                     document_chunks
                                            │ Ollama /api/embed (bge-m3)
                                            ▼
                                  vector(1024) in PostgreSQL + pgvector
                                            │
question ──▶ embed ──▶ ORDER BY embedding <=> question  ◀───┘
                              │
              closest distance ≤ RAG_MAX_DISTANCE ?
                   │ no                    │ yes
                   ▼                       ▼
        "Nie znalazłem…"          chunks become the prompt context
        status needs_review    ──▶ Ollama /api/generate (qwen3:8b)
        no sources                 ──▶ answer streamed over SSE + sources
```

### Why it refuses to answer

An embedding search always returns its closest chunks, even when the knowledge base contains
nothing on the subject — "closest" is not "relevant". So the distance of the **nearest** chunk is
compared against `RAG_MAX_DISTANCE`. Above it, the question counts as uncovered: the assistant
returns a fixed message, records the question as `needs_review`, and sends no sources to the
model, so there is nothing for it to embroider on.

The threshold applies only to the closest chunk. Once a question counts as covered, every
retrieved chunk stays in the context, because filtering each one separately would silently
shrink the evidence the answer is built on.

The default of `0.54` was measured, not guessed. `bge-m3` packs distances into a narrow band, so
the number has to come from the corpus: here, questions the documents answer land between
**0.39 and 0.52**, off-topic ones (bread starter, football, capital cities) between **0.58 and
0.64**. Another model or a broader corpus shifts both bands — measure with `GET /api/search`,
which returns distances without generating an answer.

## Quick start

Requirements: Docker with Compose, and [Ollama](https://ollama.com) on the host. PHP, Composer
and Node run in containers.

```bash
ollama pull bge-m3          # embeddings, multilingual, matches the vector(1024) column
ollama pull qwen3:8b        # writes the answers

cp .env.example .env        # OLLAMA_URL must point at the host, not the container
docker run --rm -v "$PWD":/app -w /app composer:2 install
docker run --rm -v "$PWD":/app -w /app node:22 sh -c "npm install && npm run build && npm run build:widget"

docker compose up -d
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
docker compose restart worker     # it gave up before the tables existed
```

The interface is at `http://localhost:8000`. Tests: `docker compose exec app php artisan test`.

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/chat` · `POST /api/chat/stream` | ask a question; the stream ends with a `done` event carrying sources and the question id |
| `GET /api/search?q=…` | retrieval only, with distances — useful for calibrating the threshold |
| `POST /api/documents` · `/import` · `/import-url` | add documents from text, a file (Markdown, PDF) or a web page |
| `GET|PUT|DELETE /api/documents/{id}` | manage documents; deleting one removes its chunks |
| `GET /api/questions?status=needs_review` | questions the assistant could not answer |
| `POST /api/questions/{id}/feedback` · `/resolve` | rate an answer, or close the gap by adding a document |
| `GET /api/analytics/questions` | counts, most asked, and questions grouped by meaning |

The full contract is in `docs/openapi.yaml`.

```bash
curl -X POST http://localhost:8000/api/chat -H "Content-Type: application/json" \
  -d '{"question":"What is tracking difference?","limit":2}'
```

```json
{
  "answer": "Tracking difference refers to the difference between the return of an ETF and the return of the index it tracks…",
  "sources": [
    {"title": "ETF basics", "document_id": 1, "position": 0, "distance": 0.4754, "excerpt": "# ETF basics\n\nAn ETF (Exchange Traded Fund) is a fund traded…"}
  ]
}
```

Generation is not fast: on an M4 with `qwen3:8b`, a request takes roughly 50 seconds.

### Embeddable widget

```html
<script src="http://localhost:8000/widget.js" data-title="Ask about ETFs" defer></script>
```

Plain TypeScript in a shadow root (4.5 kB), so it neither carries the application's styles nor
inherits the host's. Optional attributes: `data-api`, `data-title`, `data-accent`.
`/widget-demo` serves a page that is deliberately not the application.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Ollama as seen from the container |
| `OLLAMA_EMBEDDING_MODEL` | `bge-m3` | its output dimension must match the `vector(1024)` column |
| `OLLAMA_CHAT_MODEL` | `qwen3:8b` | writes the answer from the retrieved context |
| `RAG_MAX_DISTANCE` | `0.54` | above this distance the assistant declines; model- and corpus-specific |
| `RAG_QUESTION_SIMILARITY` | `0.8` | when two questions count as the same in analytics |
| `QUEUE_CONNECTION` | `redis` | `sync` makes uploads block until embedding finishes |
| `REDIS_QUEUE_RETRY_AFTER` | `180` | must stay above the worker `--timeout` (120) |

**Editing `.env` in a running stack changes nothing.** `env_file` copies the values into the
container environment when the container is created, and Laravel's dotenv loader does not
override variables that already exist there. Apply changes with:

```bash
docker compose up -d --force-recreate app worker
```

### Choosing models

The embedding model decides which chunks the question reaches; the chat model only phrases what
it is handed. An upgrade there polishes the wording, while the same upgrade on the embedding side
changes which documents are found at all. Hence `bge-m3`: it is multilingual, and an
English-trained model such as `all-MiniLM-L6-v2` retrieves poorly from Polish documents no matter
what writes the answer.

Changing the embedding model means re-indexing everything — vectors from different models are not
comparable, `RAG_MAX_DISTANCE` stops matching reality, and the column width is fixed in the schema.

## Limitations

- **Chunking is character-based.** Fixed 500-character windows, 50-character overlap, applied to
  raw text. Sentences, headings and code blocks get cut mid-stride.
- **No vector index.** No HNSW or IVFFlat, so every search scans all chunks. Fine for hundreds.
- **No authentication.** Every API route is public, including document creation and deletion,
  and CORS allows any origin on `/api/*` — needed for the widget, far too open for a deployment.
- **`GET /api/documents` returns full document text.** No pagination.
- **CI does not run the tests.** It only validates `composer.json` and installs dependencies.
- **Mixed languages.** Interface and the "I don't know" message are Polish, code and prompts
  English; the prompt does not pin the answer's language.
- **PDF extraction is text-only** (`smalot/pdfparser`), no OCR. Imported web pages keep leftover
  CSS, because extraction is not structure-aware — visible in the screenshot above.
- **Retrieval is purely semantic.** No keyword or hybrid search, no reranking, no query
  rewriting, no conversation memory.

## Roadmap

Not implemented, kept here so the list above stays honest: hybrid search with reranking, quality
tests in CI (fixed questions with expected sources), structure-aware chunking, an Ollama/OpenAI
switch per knowledge base, handing an unanswered question to a human by mail or webhook, and
multiple separate knowledge bases.

## License

MIT.
