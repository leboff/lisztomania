-- Migration: Add RPC functions for transaction-safe multi-step database operations.
-- Addresses P0 data-safety issue: generation pipeline and trip copy lacked atomicity.
-- If any intermediate step failed, the database was left in a partially mutated state.

-- ─────────────────────────────────────────
-- RPC: replace_checklist_items
-- Atomically deletes all LLM-generated items for a trip and inserts a fresh set.
-- Called by the generation pipeline so a failed insert never leaves the checklist empty.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.replace_checklist_items(
  p_trip_id UUID,
  p_items   JSONB    -- array of item objects
) RETURNS void AS $$
BEGIN
  DELETE FROM public.checklist_items
  WHERE trip_id = p_trip_id AND source = 'llm';

  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    INSERT INTO public.checklist_items (
      trip_id, item_name, category, timing_attribute,
      bag_id, assigned_profile_id, quantity, reasoning, source, sort_order
    )
    SELECT
      p_trip_id,
      item->>'item_name',
      item->>'category',
      item->>'timing_attribute',
      (item->>'bag_id')::uuid,
      (item->>'assigned_profile_id')::uuid,
      (item->>'quantity')::integer,
      item->>'reasoning',
      COALESCE(item->>'source', 'llm'),
      (item->>'sort_order')::integer
    FROM jsonb_array_elements(p_items) AS item;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────
-- RPC: copy_trip_atomic
-- Atomically copies a trip: creates new trip record, links profiles, copies bags
-- (building an old→new bag-id map internally), and optionally copies checklist
-- items with remapped bag references. Returns the new trip's UUID.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.copy_trip_atomic(
  p_new_trip       JSONB,    -- fields for the new trip row
  p_profile_ids    UUID[],   -- profile IDs to link to the new trip
  p_bags           JSONB,    -- source bags: [{id, name, type, owner_profile_id}, ...]
  p_items          JSONB,    -- source checklist items (null or [] if not copying)
  p_copy_checklist BOOLEAN
) RETURNS UUID AS $$
DECLARE
  v_new_trip_id UUID;
  v_bag         JSONB;
  v_new_bag_id  UUID;
  v_bag_id_map  JSONB := '{}';
BEGIN
  -- Insert the new trip record
  INSERT INTO public.trips (
    user_id, name, origin, destination, start_date, end_date,
    trip_type, trip_events,
    accommodation_id, accommodation_type, sleeping_rooms,
    origin_city, origin_state, origin_country,
    destination_city, destination_state, destination_country,
    template_trip_id, generation_status, hindsight_completed, collaborator_ids
  ) VALUES (
    (p_new_trip->>'user_id')::uuid,
    p_new_trip->>'name',
    p_new_trip->>'origin',
    p_new_trip->>'destination',
    (p_new_trip->>'start_date')::date,
    (p_new_trip->>'end_date')::date,
    p_new_trip->>'trip_type',
    ARRAY(SELECT value FROM jsonb_array_elements_text(COALESCE(p_new_trip->'trip_events', '[]'::jsonb))),
    (p_new_trip->>'accommodation_id')::uuid,
    p_new_trip->>'accommodation_type',
    p_new_trip->'sleeping_rooms',
    p_new_trip->>'origin_city',
    p_new_trip->>'origin_state',
    p_new_trip->>'origin_country',
    p_new_trip->>'destination_city',
    p_new_trip->>'destination_state',
    p_new_trip->>'destination_country',
    (p_new_trip->>'template_trip_id')::uuid,
    COALESCE(p_new_trip->>'generation_status', 'pending'),
    COALESCE((p_new_trip->>'hindsight_completed')::boolean, false),
    '{}'::uuid[]
  )
  RETURNING id INTO v_new_trip_id;

  -- Link traveler profiles
  IF p_profile_ids IS NOT NULL AND array_length(p_profile_ids, 1) > 0 THEN
    INSERT INTO public.trip_profiles (trip_id, profile_id)
    SELECT v_new_trip_id, unnest(p_profile_ids);
  END IF;

  -- Copy bags, building old_id → new_id map for checklist remapping
  FOR v_bag IN SELECT value FROM jsonb_array_elements(COALESCE(p_bags, '[]'::jsonb)) LOOP
    INSERT INTO public.bags (trip_id, name, type, owner_profile_id)
    VALUES (
      v_new_trip_id,
      v_bag->>'name',
      v_bag->>'type',
      (v_bag->>'owner_profile_id')::uuid
    )
    RETURNING id INTO v_new_bag_id;

    v_bag_id_map := v_bag_id_map || jsonb_build_object(v_bag->>'id', v_new_bag_id::text);
  END LOOP;

  -- Copy checklist items with remapped bag IDs
  IF p_copy_checklist AND p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    INSERT INTO public.checklist_items (
      trip_id, item_name, category, timing_attribute,
      assigned_profile_id, bag_id, quantity, reasoning,
      source, sort_order, is_checked, was_unused, was_wished_for
    )
    SELECT
      v_new_trip_id,
      item->>'item_name',
      item->>'category',
      item->>'timing_attribute',
      (item->>'assigned_profile_id')::uuid,
      CASE
        WHEN item->>'bag_id' IS NOT NULL AND v_bag_id_map ? (item->>'bag_id')
        THEN (v_bag_id_map->>(item->>'bag_id'))::uuid
        ELSE NULL
      END,
      (item->>'quantity')::integer,
      item->>'reasoning',
      COALESCE(item->>'source', 'manual'),
      (item->>'sort_order')::integer,
      false,
      false,
      false
    FROM jsonb_array_elements(p_items) AS item;
  END IF;

  RETURN v_new_trip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
