alter table public.users
  add column if not exists is_admin boolean not null default false;

create table if not exists public.system_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;

create policy "system_settings_deny" on public.system_settings
  using (false);
