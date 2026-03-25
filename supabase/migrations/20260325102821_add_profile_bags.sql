-- ─────────────────────────────────────────
-- PROFILE BAGS
-- ─────────────────────────────────────────
create table if not exists public.profile_bags (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('checked', 'carry_on', 'personal_item')),
  size       text,
  created_at timestamptz not null default now()
);
create index if not exists profile_bags_profile_id_idx on public.profile_bags(profile_id);

alter table public.profile_bags enable row level security;
drop policy if exists "profile_bags_own" on public.profile_bags;
create policy "profile_bags_own" on public.profile_bags
  using (exists (select 1 from public.profiles pr where pr.id = profile_id and pr.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles pr where pr.id = profile_id and pr.user_id = auth.uid()));
