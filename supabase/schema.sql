-- Lisztomania Database Schema
-- Run this in the Supabase SQL editor to set up the database.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- USERS (extends Supabase auth.users)
-- ─────────────────────────────────────────
create table if not exists public.users (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null unique,
  name           text,
  default_origin text,
  created_at     timestamptz not null default now()
);

-- Trigger: auto-create row on new Supabase auth user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────
-- TRAVELER PROFILES
-- ─────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  name         text not null,
  birthday     date,
  age          integer,
  gender       text check (gender in ('male','female','non_binary','prefer_not_to_say')),
  relationship text check (relationship in ('self','partner','child','other')),
  notes        text,
  created_at   timestamptz not null default now()
);

-- Migration: add birthday column to existing deployments
-- alter table public.profiles add column if not exists birthday date;
-- Migration: add notes column to existing deployments
-- alter table public.profiles add column if not exists notes text;
create index if not exists profiles_user_id_idx on public.profiles(user_id);

-- ─────────────────────────────────────────
-- ITEM LIBRARY
-- ─────────────────────────────────────────
create table if not exists public.library_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  name                text not null,
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  weather_tag         text,
  trip_type_tag       text,
  always_pack         boolean not null default false,
  created_at          timestamptz not null default now()
);
create index if not exists library_items_user_id_idx on public.library_items(user_id);

-- ─────────────────────────────────────────
-- TRIPS
-- ─────────────────────────────────────────
create table if not exists public.trips (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  name                text,
  origin              text not null,
  destination         text not null,
  start_date          date not null,
  end_date            date not null,
  trip_type           text,
  trip_events         text[] not null default '{}',
  weather_summary     text,
  weather_data        jsonb,
  collaborator_ids    uuid[] not null default '{}',
  template_trip_id    uuid references public.trips(id) on delete set null,
  generation_status   text not null default 'pending'
                      check (generation_status in ('pending','generating','complete','error')),
  hindsight_completed boolean not null default false,
  created_at          timestamptz not null default now()
);
create index if not exists trips_user_id_idx on public.trips(user_id);
create index if not exists trips_collaborator_ids_idx on public.trips using gin(collaborator_ids);

-- Junction: which profiles travel on which trip
create table if not exists public.trip_profiles (
  trip_id    uuid not null references public.trips(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (trip_id, profile_id)
);

-- ─────────────────────────────────────────
-- BAGS
-- ─────────────────────────────────────────
create table if not exists public.bags (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  name             text not null,
  type             text not null check (type in ('checked','carry_on','personal_item')),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists bags_trip_id_idx on public.bags(trip_id);

-- ─────────────────────────────────────────
-- CHECKLIST ITEMS
-- ─────────────────────────────────────────
create table if not exists public.checklist_items (
  id                  uuid primary key default gen_random_uuid(),
  trip_id             uuid not null references public.trips(id) on delete cascade,
  item_name           text not null,
  category            text,
  timing_attribute    text check (
    timing_attribute in ('pack_in_advance','morning_of','buy_at_destination','other')
  ),
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  bag_id              uuid references public.bags(id) on delete set null,
  is_checked          boolean not null default false,
  was_unused          boolean not null default false,
  source              text not null default 'llm' check (source in ('llm','manual')),
  sort_order          integer,
  quantity            integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists checklist_items_trip_id_idx on public.checklist_items(trip_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists checklist_items_updated_at on public.checklist_items;
create trigger checklist_items_updated_at
  before update on public.checklist_items
  for each row execute procedure public.set_updated_at();

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table public.users           enable row level security;
alter table public.profiles        enable row level security;
alter table public.library_items   enable row level security;
alter table public.trips           enable row level security;
alter table public.trip_profiles   enable row level security;
alter table public.bags            enable row level security;
alter table public.checklist_items enable row level security;

-- Users: own row only
drop policy if exists "users_own" on public.users;
create policy "users_own" on public.users
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Profiles: own rows
drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Library items: own rows
drop policy if exists "library_items_own" on public.library_items;
create policy "library_items_own" on public.library_items
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trips: owner or collaborator
drop policy if exists "trips_access" on public.trips;
create policy "trips_access" on public.trips
  using (auth.uid() = user_id or auth.uid() = any(collaborator_ids))
  with check (auth.uid() = user_id);

-- Trip profiles: via trip access
drop policy if exists "trip_profiles_access" on public.trip_profiles;
create policy "trip_profiles_access" on public.trip_profiles
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id
        and (t.user_id = auth.uid() or auth.uid() = any(t.collaborator_ids))
    )
  );

-- Bags: via trip access
drop policy if exists "bags_access" on public.bags;
create policy "bags_access" on public.bags
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id
        and (t.user_id = auth.uid() or auth.uid() = any(t.collaborator_ids))
    )
  );

-- Checklist items: via trip access (Realtime uses this policy)
drop policy if exists "checklist_items_access" on public.checklist_items;
create policy "checklist_items_access" on public.checklist_items
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id
        and (t.user_id = auth.uid() or auth.uid() = any(t.collaborator_ids))
    )
  );

-- ─────────────────────────────────────────
-- REALTIME
-- Enable replication on checklist_items so Supabase Realtime can broadcast changes.
-- Run this separately if needed:
-- alter publication supabase_realtime add table public.checklist_items;
-- ─────────────────────────────────────────
