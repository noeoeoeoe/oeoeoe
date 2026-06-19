# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> Expo SDK 56. Before writing code against any Expo/React Native API, consult the
> exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ — APIs shift between SDKs.

## What this is

**oeoeoe** — a personal life-tracking mobile app (React Native + Expo, TypeScript). Four
tabs: **Errands** (todos), **Gym** (workout sessions), **Recipes**, and **Track** (meals + weight).
Data lives in **Supabase** (hosted Postgres). **Auth is passwordless email magic-link**, with an
anonymous "continue without an account" fallback; see "Auth" below.

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
renders `Gate`. `Gate` shows the email `SignIn` when there's no session, otherwise renders
`<AppTabs>` (see "Auth"). The four tab screens are `index.tsx` (Errands), `gym.tsx`, `recipes.tsx`,
and `track.tsx` (meals + weight). Recipes is itself a list → detail → form flow driven by local
state (no nested routes), with components under `src/components/recipes/`.

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

Email login is **enabled** (passwordless OTP), with an anonymous fallback. `Gate` in
`src/app/_layout.tsx`:

- **no session** → renders `SignIn` (`src/components/sign-in.tsx`): enter email → 6-digit code, or
  *"Continue without an account"* → `supabase.auth.signInAnonymously()`.
- **any session** (anonymous or email) → renders the app, wrapped in `AccountProvider`
  (`src/lib/account.tsx`) so any screen can open the account sheet.

Auth uses passwordless **magic links** (not OTP codes — see "Email delivery" below). `SignIn` is
**adaptive** to the current session: signed out → *"Email me a link"*; **anonymous** → *"Add email &
sync"* links an email to the *current* anon user via `supabase.auth.updateUser({ email })` (so data
created anonymously is preserved and becomes syncable) **or** sign in to an existing account;
**email user** → shows the email + Sign out. Clicking the emailed link returns to `emailRedirectTo`
(web: `window.location.origin`; native: the `oeoeoe://` scheme) and `detectSessionInUrl` +
`flowType: 'implicit'` (web, set in `src/lib/supabase.ts`) establish the session. The in-app entry
point is the **Account** button in the web tab bar (`app-tabs.web.tsx`, via `useAccount()`); the
native `NativeTabs` bar has no such button yet, and native magic-link redirect handling isn't wired.
Still requires **"Allow anonymous sign-ins"** enabled, and the deploy URL (+ `localhost` for dev)
added to **Supabase → Authentication → URL Configuration → Redirect URLs**. RLS is unchanged —
`auth.uid()` scopes rows whether the user is anonymous or email.

**Email delivery — why magic links, not codes.** Supabase only lets you customize email templates
(and raises the ~few/hour rate limit) once **custom SMTP** is configured. A 6-digit-code flow needs
the template to emit `{{ .Token }}`, so without SMTP it's impossible — but the *default* email sends
a magic link, which works as-is. Hence magic links. For heavier use, configure custom SMTP (e.g.
Resend) to lift the rate limit (and you could then switch back to codes if preferred).

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
