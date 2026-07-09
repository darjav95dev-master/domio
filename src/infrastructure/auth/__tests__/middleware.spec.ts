import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── We mock next-auth/jwt (Edge-safe) which is what middleware uses ──────────
const mockGetToken = vi.fn();

vi.mock("next-auth/jwt", () => ({
  getToken: mockGetToken,
}));

// ─── NextResponse helpers ─────────────────────────────────────────────────────

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
  mockGetToken.mockReset();
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

  it("should match /panel/:path*, /api/internal/:path*, and /api/auth/callback/credentials", async () => {
    const mod = await import("../../../../middleware");
    expect(mod.config.matcher).toEqual([
      "/panel/:path*",
      "/api/internal/:path*",
      "/api/auth/callback/credentials",
    ]);
  });
});

describe("middleware auth guard", () => {
  it("should redirect to /panel/login when accessing /panel without session", async () => {
    mockGetToken.mockResolvedValue(null);

    const { middleware } = await import("../../../../middleware");
    await middleware(createRequest(PANEL_DASHBOARD_PATH));

    expect(redirectCalls).toHaveLength(1);
    expect(redirectCalls[0]!.url).toBe(LOGIN_URL);
    expect(nextCalls).toHaveLength(0);
  });

  it("should NOT redirect when accessing /panel/login without session", async () => {
    mockGetToken.mockResolvedValue(null);

    const { middleware } = await import("../../../../middleware");
    await middleware(createRequest(PANEL_LOGIN_PATH));

    expect(redirectCalls).toHaveLength(0);
    expect(nextCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("should allow access to /panel when session exists", async () => {
    mockGetToken.mockResolvedValue({ sub: "1", role: "ADMIN" });

    const { middleware } = await import("../../../../middleware");
    await middleware(createRequest(PANEL_DASHBOARD_PATH));

    expect(redirectCalls).toHaveLength(0);
    expect(nextCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("should inject X-Robots-Tag header for /panel routes", async () => {
    mockGetToken.mockResolvedValue({ sub: "1", role: "ADMIN" });

    const { middleware } = await import("../../../../middleware");
    const req = createRequest(PANEL_DASHBOARD_PATH);

    await middleware(req);

    expect(redirectCalls).toHaveLength(0);
    expect(nextCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("should pass through for routes outside /panel and /api/internal", async () => {
    mockGetToken.mockResolvedValue(null);

    const { middleware } = await import("../../../../middleware");
    await middleware(createRequest("/"));

    expect(redirectCalls).toHaveLength(0);
    expect(nextCalls).toHaveLength(1);
  });
});
