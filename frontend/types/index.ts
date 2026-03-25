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
  birthday: string | null;
  age: number | null;
  gender: "male" | "female" | "non_binary" | "prefer_not_to_say" | null;
  relationship: "self" | "partner" | "child" | "other" | null;
  notes: string | null;
  created_at: string | null;
  bags?: ProfileBag[];
}

export interface ProfileBag {
  id: string;
  profile_id: string;
  type: BagType;
  size: string | null;
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
  item_type: "packing" | "task";
  created_at: string | null;
}


export type GenerationStatus = "pending" | "generating" | "complete" | "error";
export type BagType = "checked" | "carry_on" | "personal_item";
export type TimingAttribute = "pack_in_advance" | "morning_of" | "buy_at_destination" | "other";
export type AccommodationType =
  | "hotel"
  | "vacation_rental"
  | "camping"
  | "friends_family"
  | "other";

export interface AccommodationRoom {
  name: string;
}

export interface Accommodation {
  id: string;
  user_id: string;
  name: string;
  accommodation_type: AccommodationType | null;
  rooms: AccommodationRoom[];
  notes: string | null;
  created_at: string | null;
}

export interface SleepingRoom {
  name: string;
  profile_ids: string[];
}

export interface Trip {
  id: string;
  user_id: string;
  name: string | null;
  origin: string;
  destination: string;
  start_date: string;
  end_date: string;
  trip_type: string | null;
  trip_events: string[];
  weather_summary: string | null;
  weather_data: Record<string, unknown> | null;
  collaborator_ids: string[];
  collaborators?: { id: string; email: string; name?: string }[];
  template_trip_id: string | null;
  generation_status: GenerationStatus;
  hindsight_completed: boolean;
  created_at: string | null;
  profile_ids: string[];
  accommodation_id: string | null;
  accommodation_type: AccommodationType | null;
  sleeping_rooms: SleepingRoom[] | null;
  origin_city: string | null;
  origin_state: string | null;
  origin_country: string | null;
  destination_city: string | null;
  destination_state: string | null;
  destination_country: string | null;
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
  quantity: number | null;
  reasoning: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type ChecklistView = "bag" | "person" | "category" | "timing";
