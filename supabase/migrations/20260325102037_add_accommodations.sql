-- ─────────────────────────────────────────
-- SAVED ACCOMMODATIONS
-- ─────────────────────────────────────────
create table if not exists public.accommodations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  name               text not null,
  accommodation_type text check (accommodation_type in ('hotel','vacation_rental','camping','friends_family','other')),
  rooms              jsonb not null default '[]'::jsonb,
  -- rooms shape: [{"name": "Master Bedroom"}, {"name": "Kids Room"}]
  notes              text,
  created_at         timestamptz not null default now()
);
create index if not exists accommodations_user_id_idx on public.accommodations(user_id);
alter table public.accommodations enable row level security;
drop policy if exists "accommodations_own" on public.accommodations;
create policy "accommodations_own" on public.accommodations
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Migration: add accommodation fields to trips
alter table public.trips
  add column if not exists accommodation_id   uuid references public.accommodations(id) on delete set null,
  add column if not exists accommodation_type text
    check (accommodation_type in ('hotel','vacation_rental','camping','friends_family','other')),
  add column if not exists sleeping_rooms     jsonb;
-- sleeping_rooms shape: [{"name":"Master","profile_ids":["uuid-a","uuid-b"]},{"name":"Kids Room","profile_ids":["uuid-c"]}]
