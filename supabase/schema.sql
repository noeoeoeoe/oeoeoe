-- Daily — database schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → paste → Run.
-- Re-running is safe (idempotent): tables/policies are only created if absent.
--
-- Every table is owned per-user. `user_id` defaults to the caller's auth id, and
-- Row Level Security ensures a user can only ever read/write their own rows — the
-- foundation that makes cross-device sync safe with a shared account.

-- ── Errands ──────────────────────────────────────────────────────────────────
create table if not exists public.errands (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null,
  amount     numeric,      -- structured quantity (e.g. 600)
  unit       text,         -- canonical unit (e.g. 'g'); see src/constants/units.ts
  done       boolean not null default false,
  due_date   date,
  created_at timestamptz not null default now()
);

-- Add columns to errands created before they existed (idempotent).
alter table public.errands add column if not exists amount numeric;
alter table public.errands add column if not exists unit text;
alter table public.errands add column if not exists quantity text;

-- ── Workouts (gym sessions) ──────────────────────────────────────────────────
create table if not exists public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  performed_at timestamptz not null default now(),
  duration_min integer,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ── Meals ────────────────────────────────────────────────────────────────────
create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null,
  calories    integer,
  eaten_at    timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ── Recipes ──────────────────────────────────────────────────────────────────
-- `ingredients` is a JSONB array of { name, amount, unit, calories } objects and
-- `instructions` a JSONB array of step strings. Both are always created/edited/
-- displayed together with the recipe, so they live embedded here.
create table if not exists public.recipes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  ingredients  jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

-- Add instructions to recipes created before this column existed (idempotent).
alter table public.recipes add column if not exists instructions jsonb not null default '[]'::jsonb;

-- ── Condiments (staples) ─────────────────────────────────────────────────────
-- Ingredient names you keep stocked (salt, oil, spices…). When a recipe is added
-- to errands these are skipped by default. `name` is stored normalized
-- (lowercased/trimmed) so it matches ingredient names regardless of casing.
create table if not exists public.condiments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ── Weight entries (one per day, upserted) ───────────────────────────────────
create table if not exists public.weight_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weight_kg   numeric(5, 2) not null,
  measured_on date not null default current_date,
  created_at  timestamptz not null default now(),
  unique (user_id, measured_on)
);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Enable RLS and add an owner-only policy per table. The DO block makes the
-- CREATE POLICY idempotent (CREATE POLICY has no IF NOT EXISTS).
do $$
declare t text;
begin
  foreach t in array array['errands', 'workouts', 'meals', 'recipes', 'condiments', 'weight_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'owner_all'
    ) then
      execute format($f$
        create policy owner_all on public.%I
          for all
          using (auth.uid() = user_id)
          with check (auth.uid() = user_id)
      $f$, t);
    end if;
  end loop;
end $$;
