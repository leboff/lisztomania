-- Add reasoning column to checklist_items for LLM explanation
ALTER TABLE checklist_items
  ADD COLUMN IF NOT EXISTS reasoning text;
