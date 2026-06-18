# oeoeoe 📓

A personal life-tracking app I use every day: **errands**, **gym sessions**, **meals**, and
**weight**. Built with Expo (React Native + TypeScript), synced across my devices via Supabase.

## Setup

```bash
npm install
cp .env.example .env        # then fill in your Supabase URL + anon key
```

1. Create a free project at [supabase.com](https://supabase.com).
2. Put `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API) into `.env`.
3. Open the Supabase **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql) (creates tables + row-level security; safe to re-run).
4. Make sure Email auth is enabled (Authentication → Providers). Sign-in is a 6-digit code sent to your email — the same email on any device sees the same data.

## Run

```bash
npx expo start     # then scan the QR code with Expo Go (iOS/Android), or press i / a / w
```

## How it's built

- **Routing:** Expo Router (file-based) — each tab is a file in `src/app/`.
- **Data:** Supabase Postgres + TanStack Query. One hooks module per feature in `src/features/`.
- **Auth & sync:** passwordless email OTP; row-level security scopes every row to its owner.

See [`CLAUDE.md`](CLAUDE.md) for the full architecture and conventions.
