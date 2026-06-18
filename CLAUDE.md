# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> Expo SDK 56. Before writing code against any Expo/React Native API, consult the
> exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ — APIs shift between SDKs.

## What this is

**oeoeoe** — a personal life-tracking mobile app (React Native + Expo, TypeScript). Four
features, one per tab: **Errands** (todos), **Gym** (workout sessions), **Meals**, **Weight**.
Data lives in **Supabase** (hosted Postgres). **Auth is currently anonymous** — the app
auto-creates an anonymous Supabase session on launch (no login UI) because there's a single user.
Email-OTP login is built but disabled; see "Auth" below.

## Commands

```bash
npx expo start          # dev server; press i (iOS sim), a (Android), w (web), or scan QR in Expo Go
npm run ios             # start + open iOS simulator
npm run android         # start + open Android emulator
npm run web             # start + open web build
npx tsc --noEmit        # typecheck (the fastest correctness gate — run this after edits)
npm run lint            # ESLint (eslint-config-expo)
npx expo export --platform ios --output-dir /tmp/x   # full Metro bundle check (catches what tsc can't)
```

No test runner is configured yet. `tsc --noEmit` + `npm run lint` are the current checks; an
`export` is the closest thing to a build smoke-test. Restart the dev server after changing `.env`.

## First-run setup (required before the app does anything)

The app throws on launch without Supabase credentials. To make it run:

1. Create a free project at supabase.com.
2. Copy `.env.example` → `.env` and fill `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   from Supabase → Project Settings → API.
3. Run `supabase/schema.sql` in the Supabase SQL Editor (creates tables + RLS; idempotent).
4. Enable Email auth in Supabase → Authentication → Providers (email OTP is on by default).

## Architecture

**Routing — Expo Router, file-based.** Every file in `src/app/` is a route. `src/app/_layout.tsx`
is the root: it wraps the tree in `QueryClientProvider` → `AuthProvider` → `ThemeProvider`, then
renders `Gate`. `Gate` currently auto-signs-in anonymously when there's no session (see "Auth"),
then renders `<AppTabs>`. The four tab screens are `index.tsx` (Errands), `gym.tsx`, `meals.tsx`,
`weight.tsx`.

**The tab bar is platform-split.** `src/components/app-tabs.tsx` uses native `NativeTabs` with SF
Symbols (iOS/Android); `src/components/app-tabs.web.tsx` is a custom web tab list. Expo Router
picks `.web.tsx` automatically on web. **If you add or rename a tab, edit BOTH files** plus the
route file — the route `name=` in the native tabs and `href=` in the web tabs must match the
filename. (This `.web.tsx` override convention applies to any component, e.g. `use-color-scheme`.)

**Data layer — Supabase + TanStack Query, one module per feature.** `src/features/<feature>.ts`
exports the hooks for that feature (e.g. `useErrands`, `useAddErrand`, `useToggleErrand`). The
pattern is uniform: a `useQuery` reader plus `useMutation` writers that call
`supabase.from(...)` and `invalidateQueries` on success. To add a field or action, edit the
feature module — screens only consume these hooks and never touch `supabase` directly.

**Security model — Row Level Security, not key secrecy.** The anon key ships in the client bundle
(safe by design). What actually protects data is RLS in `supabase/schema.sql`: every table has a
`user_id uuid default auth.uid()` column and an `owner_all` policy (`auth.uid() = user_id`), so a
user can only ever read/write their own rows. Inserts omit `user_id` — the DB default fills it.
This is why the same email login on a second device sees the same data.

**Types are hand-maintained.** `src/types/db.ts` mirrors `supabase/schema.sql` by hand and is the
generic passed to `createClient<Database>` (this is what makes `.from().insert()` type-safe rather
than `never`). When you change the SQL schema, update this file too — or regenerate it:
`npx supabase gen types typescript --project-id <ref> > src/types/db.ts`.

**Theming & shared UI.** Colors/spacing/fonts come from `src/constants/theme.ts`; read theme
colors via `useTheme()`. Build screens from the shared primitives in `src/components/`:
`Screen` (scroll container with title + tab-bar-safe insets), `Card`/`Row`, `TextField`, `Button`,
and `ThemedText`/`ThemedView`. Match these rather than introducing raw `View`/`Text` with ad-hoc
styles.

## Conventions

- **Path aliases:** `@/*` → `src/*`, `@/assets/*` → `assets/*` (see `tsconfig.json`). Use them.
- **Env vars** must be prefixed `EXPO_PUBLIC_` to reach the client, and require a dev-server restart.
- **Dates:** use `src/lib/date.ts` (`todayISODate` is local-calendar, not UTC — avoids midnight
  off-by-one). Weight is keyed one-per-day and upserted on `(user_id, measured_on)`.
- Install native deps with `npx expo install <pkg>` (picks SDK-compatible versions), not bare `npm install`.

## Auth

Login is **disabled** for now (single user). `Gate` in `src/app/_layout.tsx` calls
`supabase.auth.signInAnonymously()` on launch — requires **"Allow anonymous sign-ins"** enabled in
Supabase → Authentication → Sign In / Providers. The anonymous user persists in device storage, so
it's stable across reloads but **does not sync across devices/browsers** (each gets its own anon
user). RLS still applies normally (`auth.uid()` = the anon user's id).

**Re-enabling email login:** the `SignIn` component (`src/components/sign-in.tsx`, email OTP) is
intact but unused. Render it from `Gate` when there's no session instead of signing in
anonymously. To preserve data created anonymously, link an email to the existing anon user via
`supabase.auth.updateUser({ email })` rather than signing in fresh. Note: Supabase's default email
template sends a magic *link*, not a code — to get the 6-digit code the `SignIn` UI expects, change
the "Magic Link" template to use `{{ .Token }}` instead of `{{ .ConfirmationURL }}`. The built-in
email sender is also rate-limited to a few/hour; configure custom SMTP (e.g. Resend) for real use.

## Running on a phone

Expo Go is a **dev tool only** (needs the Mac dev server running, and its SDK must match the
project's — this project is SDK 56). For actual daily use, pick one:

1. **PWA (easiest, free):** deploy the web build (`npx expo export --platform web` → host on
   Vercel/Netlify), open in Safari, Add to Home Screen. Syncs via Supabase like the native app.
2. **EAS Build → TestFlight (native, needs Apple Developer Program $99/yr):** `eas build -p ios`
   then submit to TestFlight; rebuild every ~90 days.
3. **Free Xcode sideload:** `npx expo run:ios` to a plugged-in device — but the app expires after
   7 days. Fine for trying, tedious for daily use.

Android is simpler: `eas build -p android` produces a free `.apk` to install directly (no fee, no expiry).
