# Database migrations

This backend is currently adapted to the existing Supabase schema in `public`.

Do not create the legacy `users`, `contents`, `favorites`, or `user_taste_profiles`
tables in this project. The backend maps to the existing Supabase tables instead:

- `auth.users` + `public.profiles` for users
- `public.content` for catalog content
- `public.watchlist` for saved items
- `public.swipes` for swipe events
- `public.user_preferences` for taste preferences

Future schema changes should be added here as small, versioned migrations after
checking the live Supabase schema.
