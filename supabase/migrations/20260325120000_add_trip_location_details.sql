-- Migration to add structured location details to trips
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS origin_city text,
  ADD COLUMN IF NOT EXISTS origin_state text,
  ADD COLUMN IF NOT EXISTS origin_country text,
  ADD COLUMN IF NOT EXISTS destination_city text,
  ADD COLUMN IF NOT EXISTS destination_state text,
  ADD COLUMN IF NOT EXISTS destination_country text;
