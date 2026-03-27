alter table public.checklist_items
  add column if not exists was_wished_for boolean not null default false;
