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
  done       boolean not null default false,
  due_date   date,
  created_at timestamptz not null default now()
);

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
  foreach t in array array['errands', 'workouts', 'meals', 'weight_entries'] loop
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
