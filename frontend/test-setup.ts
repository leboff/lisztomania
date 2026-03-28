import "@testing-library/jest-dom";

// Mock Supabase browser client
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  }),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));
