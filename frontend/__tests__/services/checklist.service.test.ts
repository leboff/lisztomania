import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock apiClient so no real HTTP calls are made
vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { checklistService } from "@/services/checklist.service";
import { apiClient } from "@/lib/api/client";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checklistService.list", () => {
  it("calls GET /trips/{id}/checklist", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);
    await checklistService.list("trip-123");
    expect(apiClient.get).toHaveBeenCalledWith("/trips/trip-123/checklist");
  });
});

describe("checklistService.add", () => {
  it("calls POST /trips/{id}/checklist with body", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    await checklistService.add("trip-123", { item_name: "Sunscreen", category: "Toiletries" });
    expect(apiClient.post).toHaveBeenCalledWith(
      "/trips/trip-123/checklist",
      { item_name: "Sunscreen", category: "Toiletries" }
    );
  });
});

describe("checklistService.update", () => {
  it("calls PATCH /checklist/{id} with partial body", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({});
    await checklistService.update("item-456", { is_checked: true });
    expect(apiClient.patch).toHaveBeenCalledWith("/checklist/item-456", { is_checked: true });
  });
});

describe("checklistService.delete", () => {
  it("calls DELETE /checklist/{id}", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);
    await checklistService.delete("item-789");
    expect(apiClient.delete).toHaveBeenCalledWith("/checklist/item-789");
  });
});

describe("checklistService.generate", () => {
  it("calls POST /trips/{id}/generate without refresh param by default", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    await checklistService.generate("trip-123");
    expect(apiClient.post).toHaveBeenCalledWith("/trips/trip-123/generate");
  });

  it("appends ?refresh_weather=true when requested", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    await checklistService.generate("trip-123", { refreshWeather: true });
    expect(apiClient.post).toHaveBeenCalledWith("/trips/trip-123/generate?refresh_weather=true");
  });
});

describe("checklistService.getWeather", () => {
  it("encodes destination in URL", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ summary: "", data: {} });
    await checklistService.getWeather("New York", "2026-07-01", "2026-07-07");
    expect(apiClient.get).toHaveBeenCalledWith(
      "/weather?destination=New%20York&start_date=2026-07-01&end_date=2026-07-07"
    );
  });

  it("includes lat/lon when provided", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ summary: "", data: {} });
    await checklistService.getWeather("Miami", "2026-07-01", "2026-07-07", 25.8, -80.2);
    const url = vi.mocked(apiClient.get).mock.calls[0][0] as string;
    expect(url).toContain("lat=25.8");
    expect(url).toContain("lon=-80.2");
  });
});

describe("checklistService.submitHindsight", () => {
  it("posts unused and wished-for item ids", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    await checklistService.submitHindsight("trip-1", ["item-a", "item-b"], ["item-c"]);
    expect(apiClient.post).toHaveBeenCalledWith("/trips/trip-1/hindsight", {
      unused_item_ids: ["item-a", "item-b"],
      wished_for_item_ids: ["item-c"],
    });
  });

  it("defaults wished_for to empty array", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});
    await checklistService.submitHindsight("trip-1", ["item-a"]);
    expect(apiClient.post).toHaveBeenCalledWith("/trips/trip-1/hindsight", {
      unused_item_ids: ["item-a"],
      wished_for_item_ids: [],
    });
  });
});
