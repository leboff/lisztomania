import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChecklistProgress } from "@/hooks/useChecklistProgress";
import type { ChecklistItem, Bag, Profile } from "@/types";

function makeItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: "item-1",
    trip_id: "trip-1",
    item_name: "Passport",
    category: "Documents",
    timing_attribute: "pack_in_advance",
    assigned_profile_id: null,
    bag_id: null,
    is_checked: false,
    was_unused: false,
    was_wished_for: false,
    source: "llm",
    sort_order: null,
    quantity: null,
    reasoning: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

function makeBag(overrides: Partial<Bag> = {}): Bag {
  return {
    id: "bag-1",
    trip_id: "trip-1",
    name: "Carry-on",
    type: "carry_on",
    owner_profile_id: null,
    created_at: null,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile-1",
    user_id: "user-1",
    name: "Alice",
    birthday: null,
    age: 30,
    gender: null,
    relationship: "self",
    notes: null,
    created_at: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Global progress
// ---------------------------------------------------------------------------

describe("useChecklistProgress — global totals", () => {
  it("returns zeros when items list is empty", () => {
    const { result } = renderHook(() => useChecklistProgress([], [], []));
    expect(result.current.total).toBe(0);
    expect(result.current.checked).toBe(0);
    expect(result.current.globalPercent).toBe(0);
  });

  it("returns 100% when all items are checked", () => {
    const items = [
      makeItem({ id: "i1", is_checked: true }),
      makeItem({ id: "i2", is_checked: true }),
    ];
    const { result } = renderHook(() => useChecklistProgress(items, [], []));
    expect(result.current.globalPercent).toBe(100);
    expect(result.current.checked).toBe(2);
  });

  it("returns 0% when no items are checked", () => {
    const items = [makeItem(), makeItem({ id: "i2" })];
    const { result } = renderHook(() => useChecklistProgress(items, [], []));
    expect(result.current.globalPercent).toBe(0);
    expect(result.current.total).toBe(2);
  });

  it("rounds percent correctly", () => {
    // 1 of 3 = 33.33... → rounds to 33
    const items = [
      makeItem({ id: "i1", is_checked: true }),
      makeItem({ id: "i2" }),
      makeItem({ id: "i3" }),
    ];
    const { result } = renderHook(() => useChecklistProgress(items, [], []));
    expect(result.current.globalPercent).toBe(33);
  });
});

// ---------------------------------------------------------------------------
// By-profile breakdown
// ---------------------------------------------------------------------------

describe("useChecklistProgress — byProfile", () => {
  it("calculates progress per profile", () => {
    const profile = makeProfile({ id: "p1" });
    const items = [
      makeItem({ id: "i1", assigned_profile_id: "p1", is_checked: true }),
      makeItem({ id: "i2", assigned_profile_id: "p1", is_checked: false }),
    ];
    const { result } = renderHook(() => useChecklistProgress(items, [], [profile]));
    const p = result.current.byProfile[0];
    expect(p.total).toBe(2);
    expect(p.checked).toBe(1);
    expect(p.percent).toBe(50);
  });

  it("returns 0% for profile with no items", () => {
    const profile = makeProfile({ id: "p1" });
    const { result } = renderHook(() => useChecklistProgress([], [], [profile]));
    expect(result.current.byProfile[0].percent).toBe(0);
  });

  it("does not include items assigned to other profiles", () => {
    const alice = makeProfile({ id: "p1", name: "Alice" });
    const bob = makeProfile({ id: "p2", name: "Bob" });
    const items = [
      makeItem({ id: "i1", assigned_profile_id: "p1", is_checked: true }),
      makeItem({ id: "i2", assigned_profile_id: "p2", is_checked: false }),
    ];
    const { result } = renderHook(() => useChecklistProgress(items, [], [alice, bob]));
    expect(result.current.byProfile[0].percent).toBe(100); // Alice
    expect(result.current.byProfile[1].percent).toBe(0);   // Bob
  });
});

// ---------------------------------------------------------------------------
// By-bag breakdown
// ---------------------------------------------------------------------------

describe("useChecklistProgress — byBag", () => {
  it("calculates progress per bag", () => {
    const bag = makeBag({ id: "b1" });
    const items = [
      makeItem({ id: "i1", bag_id: "b1", is_checked: true }),
      makeItem({ id: "i2", bag_id: "b1", is_checked: true }),
      makeItem({ id: "i3", bag_id: "b1", is_checked: false }),
    ];
    const { result } = renderHook(() => useChecklistProgress(items, [bag], []));
    const b = result.current.byBag[0];
    expect(b.total).toBe(3);
    expect(b.checked).toBe(2);
    expect(b.percent).toBe(67);
  });

  it("returns 0% for bag with no items", () => {
    const bag = makeBag({ id: "b1" });
    const { result } = renderHook(() => useChecklistProgress([], [bag], []));
    expect(result.current.byBag[0].percent).toBe(0);
  });
});
