import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOptimisticChecklist } from "@/hooks/useOptimisticChecklist";
import type { ChecklistItem } from "@/types";

// Mock the checklist service
vi.mock("@/services/checklist.service", () => ({
  checklistService: {
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { checklistService } from "@/services/checklist.service";

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
    quantity: 1,
    reasoning: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

function setup(initialItems: ChecklistItem[]) {
  const setItems = vi.fn();
  const items = [...initialItems];

  // Make setItems capture calls and simulate state update for the rollback path
  setItems.mockImplementation((updater: unknown) => {
    if (typeof updater === "function") updater(items);
  });

  const { result } = renderHook(() =>
    useOptimisticChecklist({ items, setItems })
  );

  return { result, setItems, items };
}

// ---------------------------------------------------------------------------
// toggleItem
// ---------------------------------------------------------------------------

describe("toggleItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies optimistic update before API call", async () => {
    const item = makeItem({ id: "i1", is_checked: false });
    const { result, setItems } = setup([item]);

    vi.mocked(checklistService.update).mockResolvedValue(item as never);

    await act(async () => {
      await result.current.toggleItem("i1");
    });

    // setItems called at least once (optimistic update)
    expect(setItems).toHaveBeenCalled();
    expect(checklistService.update).toHaveBeenCalledWith("i1", { is_checked: true });
  });

  it("rolls back on API failure", async () => {
    const item = makeItem({ id: "i1", is_checked: false });
    const { result, setItems } = setup([item]);

    vi.mocked(checklistService.update).mockRejectedValue(new Error("Network error"));

    await act(async () => {
      await result.current.toggleItem("i1");
    });

    // setItems called twice: once for optimistic, once for rollback
    expect(setItems).toHaveBeenCalledTimes(2);
  });

  it("does nothing for unknown item id", async () => {
    const item = makeItem({ id: "i1" });
    const { result, setItems } = setup([item]);

    await act(async () => {
      await result.current.toggleItem("nonexistent");
    });

    expect(setItems).not.toHaveBeenCalled();
    expect(checklistService.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reassignItem
// ---------------------------------------------------------------------------

describe("reassignItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls update with new bag_id", async () => {
    const item = makeItem({ id: "i1", bag_id: "old-bag" });
    const { result } = setup([item]);

    vi.mocked(checklistService.update).mockResolvedValue(item as never);

    await act(async () => {
      await result.current.reassignItem("i1", { bag_id: "new-bag" });
    });

    expect(checklistService.update).toHaveBeenCalledWith("i1", { bag_id: "new-bag" });
  });

  it("rolls back bag_id and profile on API failure", async () => {
    const item = makeItem({ id: "i1", bag_id: "original-bag", assigned_profile_id: "p1" });
    const { result, setItems } = setup([item]);

    vi.mocked(checklistService.update).mockRejectedValue(new Error("Server error"));

    await act(async () => {
      await result.current.reassignItem("i1", { bag_id: "new-bag" });
    });

    expect(setItems).toHaveBeenCalledTimes(2); // optimistic + rollback
  });
});

// ---------------------------------------------------------------------------
// deleteItem
// ---------------------------------------------------------------------------

describe("deleteItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes item optimistically and calls delete", async () => {
    const item = makeItem({ id: "i1" });
    const { result, setItems } = setup([item]);

    vi.mocked(checklistService.delete).mockResolvedValue(undefined as never);

    await act(async () => {
      await result.current.deleteItem("i1");
    });

    expect(setItems).toHaveBeenCalled();
    expect(checklistService.delete).toHaveBeenCalledWith("i1");
  });

  it("restores item list on delete failure", async () => {
    const item = makeItem({ id: "i1" });
    const { result, setItems } = setup([item]);

    vi.mocked(checklistService.delete).mockRejectedValue(new Error("Delete failed"));

    await act(async () => {
      await result.current.deleteItem("i1");
    });

    expect(setItems).toHaveBeenCalledTimes(2); // remove + restore
  });
});

// ---------------------------------------------------------------------------
// updateQuantity
// ---------------------------------------------------------------------------

describe("updateQuantity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls update with new quantity", async () => {
    const item = makeItem({ id: "i1", quantity: 3 });
    const { result } = setup([item]);

    vi.mocked(checklistService.update).mockResolvedValue(item as never);

    await act(async () => {
      await result.current.updateQuantity("i1", 5);
    });

    expect(checklistService.update).toHaveBeenCalledWith("i1", { quantity: 5 });
  });

  it("rolls back quantity on failure", async () => {
    const item = makeItem({ id: "i1", quantity: 3 });
    const { result, setItems } = setup([item]);

    vi.mocked(checklistService.update).mockRejectedValue(new Error("Failed"));

    await act(async () => {
      await result.current.updateQuantity("i1", 99);
    });

    expect(setItems).toHaveBeenCalledTimes(2); // optimistic + rollback
  });
});
