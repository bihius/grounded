# Grounded

FAQ assistant for a company knowledge base. The name comes from *grounding*: answers are grounded in sources, not made up. It answers questions based on uploaded documents, shows answer sources, and when it doesn't find an answer in the database — it says "I don't know" instead of making things up.

**Status: under construction.** The project is being built step by step as a learning exercise for Laravel and RAG.

## How It Works

1. You upload documents (Markdown, PDF, web page) to a chosen knowledge base.
2. In the background (Redis queue), text is split into chunks, and Ollama computes embeddings for them, which are saved in PostgreSQL with the pgvector extension.
3. The user's question is also converted into a vector. The database finds the most similar chunks, the model receives them as context, and responds by citing the sources.

## Tech Stack

Laravel (PHP 8.4) · Inertia + React + TypeScript · PostgreSQL + pgvector · Redis · Ollama (locally) · Symfony DomCrawler · Docker Compose

## Running

```bash
ollama serve                 # on host
docker compose up -d
```

Details will appear here once the first working stage is complete.
