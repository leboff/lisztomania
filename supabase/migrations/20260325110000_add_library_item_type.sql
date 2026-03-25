-- Add item_type to library_items to distinguish packing items from pre-trip task templates
ALTER TABLE library_items
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'packing'
  CHECK (item_type IN ('packing', 'task'));
