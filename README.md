# Gaas

Gaas is an entertainment discovery app with an Expo frontend and a FastAPI backend.

The backend is adapted to the existing Supabase project schema. Supabase is the source of truth for:

- authentication through Supabase Auth;
- user profiles through `public.profiles`;
- catalog data through `public.content` and related taxonomy tables;
- saved items through `public.watchlist`;
- swipe events through `public.swipes`;
- taste preferences through `public.user_preferences`.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set the real Supabase Postgres pooler `DATABASE_URL`.
3. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
4. Keep `DATABASE_CREATE_TABLES=false`.

Do not run legacy schema creation on this Supabase project. The database already has an application schema and Row Level Security policies.

## Backend

```bash
cd backend
docker compose up --build
```

Health checks:

```text
GET http://localhost:8000/health
GET http://localhost:8000/health/db
```

Auth endpoints proxy Supabase Auth so the frontend can keep calling the backend:

```text
POST /auth/register
POST /auth/login
```

The returned token is a Supabase access token. The backend validates it against Supabase Auth on authenticated requests.

## Frontend

```bash
cd frontend
npm install
npx expo start
```

For a physical phone, set the backend URL to your computer IP:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.X:8000 npx expo start
```

## Database notes

The backend currently maps legacy API concepts to the existing Supabase schema:

- `Content` -> `public.content`
- `User` -> `public.profiles` plus Supabase Auth user data
- `Favorite` -> `public.watchlist`
- `Swipe.swipe_type` -> `public.swipes.action`
- `UserTasteProfile` -> `public.user_preferences`

Future DB changes should be added under `backend/sql/migrations/` only after checking the live Supabase schema.
