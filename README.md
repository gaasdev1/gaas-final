# Gaas

Gaas is a premium dark-mode entertainment discovery MVP: swipe feed, onboarding, taste profile, backend API, normalized content schema, external API ingestion and OpenAI-ready semantic recommendations.

## API da usare

Non posso generare le tue chiavi private, ma questa base e' gia' predisposta per inserirle in `.env`.

| Area | API | Chiave |
| --- | --- | --- |
| Film / serie TV | [TMDB API](https://developer.themoviedb.org/docs) | `TMDB_API_KEY` |
| Anime / manga | [AniList GraphQL](https://docs.anilist.co/) | nessuna per query pubbliche |
| Anime / manga fallback | [Jikan API v4](https://docs.api.jikan.moe/) | nessuna |
| Videogiochi | [RAWG API](https://rawg.io/apidocs) | `RAWG_API_KEY` |
| Libri | [Google Books API](https://developers.google.com/books/docs/v1/using) | `GOOGLE_BOOKS_API_KEY` consigliata |
| Libri fallback | [Open Library APIs](https://openlibrary.org/developers/api) | nessuna |
| Podcast | [Spotify Web API](https://developer.spotify.com/documentation/web-api) | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` |
| AI / embeddings | [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings) | `OPENAI_API_KEY` |

## Struttura

```text
backend/
  app/
    api/routes/
    auth/
    models/
    schemas.py
    services/
    recommendation/
    ai/
    ingestion/
    workers/
    config/
frontend/
  app/
  components/
  services/
  store/
  types/
```

## Avvio locale

1. Copia `.env.example` in `.env` nella cartella `gaas` e inserisci almeno:
   - `JWT_SECRET_KEY`
   - `TMDB_API_KEY`
   - `OPENAI_API_KEY` se vuoi embeddings e spiegazioni AI
   - `RAWG_API_KEY`, `GOOGLE_BOOKS_API_KEY`, Spotify se vuoi copertura completa

2. Avvia backend e Redis. Il database puo' essere Supabase tramite `DATABASE_URL`:

```bash
cd backend
docker compose up --build
```

Se vuoi usare di nuovo il database locale Docker invece di Supabase, imposta un `DATABASE_URL` locale e avvia anche il profilo:

```bash
docker compose --profile local-db up --build
```

3. Apri `http://localhost:8000/docs` per vedere e provare l'API.

4. Crea un utente da app o da `/auth/register`, poi lancia ingestion da:

```text
POST http://localhost:8000/admin/ingestion/run
```

Serve il token JWT nell'header `Authorization: Bearer ...`.
Se non hai ancora configurato chiavi esterne, l'ingestion carica automaticamente un set demo curato. Puoi anche forzarlo da:

```text
POST http://localhost:8000/admin/ingestion/seed
```

5. Avvia il frontend:

```bash
cd frontend
npm install
npx expo start
```

Per visualizzare l'app:
- da telefono: installa Expo Go e scansiona il QR;
- da browser: premi `w` nel terminale Expo;
- da emulatore: premi `a` per Android o `i` per iOS.

Se usi Expo su telefono fisico, sostituisci `localhost` con l'IP del computer:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.X:8000 npx expo start
```

## Cosa include gia'

- JWT auth con password hashing.
- Tabelle PostgreSQL per utenti, contenuti, embeddings, swipe, preferiti, profili gusto, recommendation log e ingestion log.
- Supporto pgvector con modello `text-embedding-3-small`.
- Ingestion iniziale TMDB + AniList, estendibile a RAWG, Books, Open Library e Spotify Podcast.
- Ranking ibrido: semantica, generi, tag, mood, popolarita', comportamento, freshness, diversita' ed esplorazione.
- UI Expo mobile-first con dark mode, bottom tabs, onboarding, swipe feed, search, saved e taste profile.
- Modalita' demo pronta: contenuti iniziali curati e like/superlike salvati automaticamente nei preferiti.
- Decision engine backend: sessioni `/sessions`, eventi `/interaction`, feed ranking per categoria `/feed?category=...`, Top 3 `/top3/{session_id}`.

## Note di produzione

- Tieni tutte le chiavi solo nel backend.
- Limita CORS agli origin reali prima del deploy.
- Sposta ingestion e embedding batch su Celery per dataset grandi.
- Aggiungi Alembic migrations prima di un deploy serio.
- Su Railway/Render/Fly.io usa PostgreSQL con estensione `vector` e Redis managed.
