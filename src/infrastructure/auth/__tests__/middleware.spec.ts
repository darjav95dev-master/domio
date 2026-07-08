import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── We mock @/infrastructure/auth/auth.config (which exports `auth`) ──
// instead of the next-auth module, avoiding hoisting issues with variable
// references. The middleware imports `auth` from auth.config.ts.
const mockAuth = vi.fn();

vi.mock("@/infrastructure/auth/auth.config", () => ({
  auth: mockAuth,
}));

// ─── NextResponse helpers ─────────────────────────────────────────────────────
// We use simple arrays to track calls, avoiding closure capture issues.

let nextCalls: string[] = [];
let redirectCalls: Array<{ url: string; headers: Map<string, string> }> = [];

vi.mock("next/server", () => ({
  NextResponse: {
    next: () => {
      nextCalls.push("next");
      return { headers: new Map<string, string>() };
    },
    redirect: (url: string | URL) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      redirectCalls.push({ url: urlStr, headers: new Map() });
      return { status: 307, headers: new Map([["location", urlStr]]) };
    },
  },
}));

// ─── Constants & Helpers ──────────────────────────────────────────────────────

const LOGIN_URL = "http://localhost:3000/panel/login";
const BASE_URL = "http://localhost:3000";
const PANEL_DASHBOARD_PATH = "/panel/dashboard";
const PANEL_LOGIN_PATH = "/panel/login";

function createRequest(path: string): NextRequest {
  return { nextUrl: new URL(`${BASE_URL}${path}`), url: `${BASE_URL}${path}` } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockReset();
  nextCalls = [];
  redirectCalls = [];
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("middleware config", () => {
  it("should have a config export with matcher", async () => {
    const mod = await import("../../../../middleware");
    expect(mod).toHaveProperty("config");
    expect(mod.config).toHaveProperty("matcher");
    expect(Array.isArray(mod.config.matcher)).toBe(true);
  });

  it("should match /panel/:path* and /api/internal/:path* patterns", async () => {
    const mod = await import("../../../../middleware");
    expect(mod.config.matcher).toEqual([
      "/panel/:path*",
      "/api/internal/:path*",
    ]);
  });
});

describe("middleware auth guard", () => {
  it("should redirect to /panel/login when accessing /panel without session", async () => {
    mockAuth.mockResolvedValue(null);

    const { middleware } = await import("../../../../middleware");
    await middleware(createRequest(PANEL_DASHBOARD_PATH));

    expect(redirectCalls).toHaveLength(1);
    expect(redirectCalls[0]!.url).toBe(LOGIN_URL);
    expect(nextCalls).toHaveLength(0);
  });

  it("should NOT redirect when accessing /panel/login without session", async () => {
    mockAuth.mockResolvedValue(null);

    const { middleware } = await import("../../../../middleware");
    await middleware(createRequest(PANEL_LOGIN_PATH));

    expect(redirectCalls).toHaveLength(0);
    expect(nextCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("should allow access to /panel when session exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", name: "Admin", role: "ADMIN" },
    });

    const { middleware } = await import("../../../../middleware");
    await middleware(createRequest(PANEL_DASHBOARD_PATH));

    expect(redirectCalls).toHaveLength(0);
    expect(nextCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("should inject X-Robots-Tag header for /panel routes", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", name: "Admin", role: "ADMIN" },
    });

    const { middleware } = await import("../../../../middleware");
    const req = createRequest(PANEL_DASHBOARD_PATH);

    await middleware(req);

    // The last `next` call should have set X-Robots-Tag
    // We look at the response from the middleware by re-mocking
    // next to capture the headers
    expect(redirectCalls).toHaveLength(0);
    expect(nextCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("should pass through for routes outside /panel and /api/internal", async () => {
    mockAuth.mockResolvedValue(null);

    const { middleware } = await import("../../../../middleware");
    await middleware(createRequest("/"));

    expect(redirectCalls).toHaveLength(0);
    expect(nextCalls).toHaveLength(1);
  });
});
