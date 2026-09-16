# Latarnik

Asystent FAQ dla firmowej bazy wiedzy. Odpowiada na pytania na podstawie
wgranych dokumentów, pokazuje źródła odpowiedzi, a kiedy nie znajdzie
odpowiedzi w bazie - mówi „nie wiem” zamiast zmyślać.

**Status: w budowie.** Projekt powstaje jako nauka Laravela i RAG-a, krok po
kroku. Zasady pracy: [AGENTS.md](AGENTS.md), plan: [docs/PLAN.md](docs/PLAN.md).

## Jak to działa

1. Wgrywasz dokumenty (Markdown, PDF, strona WWW) do wybranej bazy wiedzy.
2. W tle (kolejka Redis) tekst jest dzielony na fragmenty, a Ollama liczy dla
   nich embeddingi zapisywane w PostgreSQL z rozszerzeniem pgvector.
3. Pytanie użytkownika też zamienia się w wektor. Baza znajduje najbardziej
   podobne fragmenty, model dostaje je jako kontekst i odpowiada, cytując źródła.

## Stos

Laravel (PHP 8.4) · Inertia + React + TypeScript · PostgreSQL + pgvector ·
Redis · Ollama (lokalnie) · Symfony DomCrawler · Docker Compose

## Uruchomienie

```bash
ollama serve                 # na hoście
docker compose up -d
```

Szczegóły pojawią się tu, gdy powstanie pierwszy działający etap.
