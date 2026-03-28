alter table public.trips
  add column if not exists accommodation_name text,
  add column if not exists accommodation_notes text;
