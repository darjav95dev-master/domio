import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockExecute = vi.hoisted(() => vi.fn());
vi.mock("@/infrastructure/db/client", () => ({
  db: { execute: mockExecute },
}));

const mockGetRedisClient = vi.hoisted(() => vi.fn());
vi.mock("@/infrastructure/rate-limiting/redis-client", () => ({
  getRedisClient: mockGetRedisClient,
}));

const { GET } = await import("@/../app/api/health/route");

const DEEP_URL = "https://domio.test/api/health?deep=1";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue(undefined);
    mockGetRedisClient.mockReturnValue({ ping: vi.fn().mockResolvedValue("PONG") });
  });

  it("shallow liveness returns 200 with env and does not touch dependencies", async () => {
    const res = await GET(new Request("https://domio.test/api/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockGetRedisClient).not.toHaveBeenCalled();
  });

  it("deep check returns 200 when DB and Redis are healthy", async () => {
    const res = await GET(new Request(DEEP_URL));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: "ok",
      checks: { database: "ok", redis: "ok" },
    });
  });

  it("deep check returns 503 when the database is down", async () => {
    mockExecute.mockRejectedValue(new Error("connection refused"));
    const res = await GET(new Request(DEEP_URL));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      status: "degraded",
      checks: { database: "down", redis: "ok" },
    });
  });

  it("deep check stays 200 when Redis is not configured (optional dependency)", async () => {
    mockGetRedisClient.mockReturnValue(null);
    const res = await GET(new Request(DEEP_URL));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: "ok",
      checks: { database: "ok", redis: "not_configured" },
    });
  });

  it("deep check returns 503 when Redis is configured but unreachable", async () => {
    mockGetRedisClient.mockReturnValue({
      ping: vi.fn().mockRejectedValue(new Error("redis timeout")),
    });
    const res = await GET(new Request(DEEP_URL));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      status: "degraded",
      checks: { database: "ok", redis: "down" },
    });
  });
});
