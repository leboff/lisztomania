export interface User {
  id: string;
  email: string;
  name: string | null;
  default_origin: string | null;
  created_at: string | null;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  gender: "male" | "female" | "non_binary" | "prefer_not_to_say" | null;
  relationship: "self" | "partner" | "child" | "other" | null;
  created_at: string | null;
}

export interface LibraryItem {
  id: string;
  user_id: string;
  name: string;
  assigned_profile_id: string | null;
  weather_tag: string | null;
  trip_type_tag: string | null;
  always_pack: boolean;
  created_at: string | null;
}

export type GenerationStatus = "pending" | "generating" | "complete" | "error";
export type BagType = "checked" | "carry_on" | "personal_item";
export type TimingAttribute = "pack_in_advance" | "morning_of" | "buy_at_destination" | "other";

export interface Trip {
  id: string;
  user_id: string;
  name: string | null;
  origin: string;
  destination: string;
  start_date: string;
  end_date: string;
  trip_type: string | null;
  weather_summary: string | null;
  weather_data: Record<string, unknown> | null;
  collaborator_ids: string[];
  template_trip_id: string | null;
  generation_status: GenerationStatus;
  hindsight_completed: boolean;
  created_at: string | null;
  profile_ids: string[];
}

export interface Bag {
  id: string;
  trip_id: string;
  name: string;
  type: BagType;
  owner_profile_id: string | null;
  created_at: string | null;
}

export interface ChecklistItem {
  id: string;
  trip_id: string;
  item_name: string;
  category: string | null;
  timing_attribute: TimingAttribute | null;
  assigned_profile_id: string | null;
  bag_id: string | null;
  is_checked: boolean;
  was_unused: boolean;
  source: "llm" | "manual";
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export type ChecklistView = "bag" | "person" | "category" | "timing";
