import { describe, it, expect, vi } from "vitest";

// Mock next-auth to avoid Edge/Node runtime resolution in test environment
vi.mock("next-auth", () => {
  const mockHandlers = { GET: vi.fn(), POST: vi.fn() };
  const mockAuth = vi.fn();
  const mockSignIn = vi.fn();
  const mockSignOut = vi.fn();

  return {
    default: vi.fn(() => ({
      handlers: mockHandlers,
      auth: mockAuth,
      signIn: mockSignIn,
      signOut: mockSignOut,
    })),
  };
});

// Mock next-auth/providers/credentials — it's a re-export from @auth/core
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: unknown) => ({ ...(config as object), type: "credentials" })),
}));

describe("auth.config module", () => {
  it("should export handlers, signIn, signOut, and auth", async () => {
    const mod = await import("../auth.config");
    expect(mod).toHaveProperty("handlers");
    expect(mod).toHaveProperty("signIn");
    expect(mod).toHaveProperty("signOut");
    expect(mod).toHaveProperty("auth");
  });

  it("should have GET and POST handlers", async () => {
    const mod = await import("../auth.config");
    expect(typeof mod.handlers.GET).toBe("function");
    expect(typeof mod.handlers.POST).toBe("function");
  });

  it("should have signIn and signOut as functions", async () => {
    const mod = await import("../auth.config");
    expect(typeof mod.signIn).toBe("function");
    expect(typeof mod.signOut).toBe("function");
  });

  it("should have auth as function", async () => {
    const mod = await import("../auth.config");
    expect(typeof mod.auth).toBe("function");
  });
});
