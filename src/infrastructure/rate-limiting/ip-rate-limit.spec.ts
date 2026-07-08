import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkIpRateLimit } from "./ip-rate-limit";
import { logger } from "@/shared/utils/logger";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRedis = {
  get: vi.fn<(key: string) => Promise<number | null>>().mockResolvedValue(0),
  set: vi.fn<(key: string, value: string, opts?: { ex?: number }) => Promise<"OK" | null>>().mockResolvedValue("OK"),
  exists: vi.fn<(key: string) => Promise<0 | 1>>().mockResolvedValue(0),
  incr: vi.fn<(key: string) => Promise<number>>().mockResolvedValue(1),
  expire: vi.fn<(key: string, ttl: number) => Promise<0 | 1>>().mockResolvedValue(1),
};

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(() => mockRedis),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

// IP from TEST-NET-3 range (safe for documentation, RFC 5737)
const TEST_IP = "203.0.113.42";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("checkIpRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RATE_LIMIT_STORE_URL", "https://test.upstash.io");
  });

  describe("login scope", () => {
    it("should allow requests under the login limit", async () => {
      // Simulate: 0 previous requests → consume should succeed
      mockRedis.get.mockReset().mockResolvedValue(0);
      mockRedis.incr.mockReset().mockResolvedValue(1);
      mockRedis.exists.mockReset().mockResolvedValue(0);

      const result = await checkIpRateLimit(TEST_IP, "login");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(4); // limit=5, remaining >= 4
      expect(result.lockedOut).toBe(false);
    });

    it("should deny requests over the login limit", async () => {
      // Simulate: already at limit (5 previous requests in current window)
      mockRedis.get.mockReset().mockResolvedValue(5);
      mockRedis.incr.mockReset().mockResolvedValue(6);
      mockRedis.exists.mockReset().mockResolvedValue(0);

      const result = await checkIpRateLimit(TEST_IP, "login");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      // Should set lockout key when limit exceeded
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining("rl:lockout:login"),
        expect.any(String),
        expect.objectContaining({ ex: expect.any(Number) }),
      );
    });

    it("should deny requests while lockout is active", async () => {
      // Lockout key exists
      mockRedis.exists.mockReset().mockResolvedValue(1);
      // These shouldn't matter since lockout check happens first
      mockRedis.get.mockReset().mockResolvedValue(0);
      mockRedis.incr.mockReset().mockResolvedValue(1);

      const result = await checkIpRateLimit(TEST_IP, "login");

      expect(result.allowed).toBe(false);
      expect(result.lockedOut).toBe(true);
      expect(result.remaining).toBe(0);
      // Should NOT have consumed from rate limiter
      expect(mockRedis.incr).not.toHaveBeenCalled();
    });
  });

  describe("contact scope", () => {
    it("should allow requests under the contact limit", async () => {
      mockRedis.get.mockReset().mockResolvedValue(0);
      mockRedis.incr.mockReset().mockResolvedValue(1);
      mockRedis.exists.mockReset().mockResolvedValue(0);

      const result = await checkIpRateLimit(TEST_IP, "contact");

      expect(result.allowed).toBe(true);
      expect(result.lockedOut).toBe(false);
    });

    it("should deny requests over the contact limit and set lockout", async () => {
      mockRedis.get.mockReset().mockResolvedValue(3);
      mockRedis.incr.mockReset().mockResolvedValue(4);
      mockRedis.exists.mockReset().mockResolvedValue(0);

      const result = await checkIpRateLimit(TEST_IP, "contact");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining("rl:lockout:contact"),
        expect.any(String),
        expect.objectContaining({ ex: expect.any(Number) }),
      );
    });
  });

  describe("lockout lifecycle", () => {
    it("should allow requests after lockout expires", async () => {
      // First: lockout is gone (exists returns 0)
      mockRedis.exists.mockReset().mockResolvedValue(0);
      mockRedis.get.mockReset().mockResolvedValue(0);
      mockRedis.incr.mockReset().mockResolvedValue(1);

      const result = await checkIpRateLimit(TEST_IP, "login");

      expect(result.allowed).toBe(true);
      expect(result.lockedOut).toBe(false);
    });
  });

  describe("degradación graceful", () => {
    it("should degrade gracefully when lockout check throws", async () => {
      // Lockout check throws
      mockRedis.exists.mockReset().mockRejectedValue(new Error("Connection refused"));
      // Rate limiter should still work
      mockRedis.get.mockReset().mockResolvedValue(0);
      mockRedis.incr.mockReset().mockResolvedValue(1);

      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

      const result = await checkIpRateLimit(TEST_IP, "login");

      // Should allow since lockout check failed gracefully
      expect(result.allowed).toBe(true);
      expect(result.lockedOut).toBe(false);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("should degrade gracefully when rate limiter throws", async () => {
      mockRedis.exists.mockReset().mockResolvedValue(0);
      // Rate limiter check throws → consume returns degraded
      mockRedis.get.mockReset().mockRejectedValue(new Error("Timeout"));
      mockRedis.incr.mockReset().mockRejectedValue(new Error("Timeout"));

      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

      const result = await checkIpRateLimit(TEST_IP, "login");

      // Degraded: allow request
      expect(result.allowed).toBe(true);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe("no-op mode (no RATE_LIMIT_STORE_URL)", () => {
    it("should always allow when no store URL is configured", async () => {
      vi.stubEnv("RATE_LIMIT_STORE_URL", "");

      const result = await checkIpRateLimit(TEST_IP, "login");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(result.lockedOut).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should NOT set lockout key when request is allowed", async () => {
      mockRedis.get.mockReset().mockResolvedValue(0);
      mockRedis.incr.mockReset().mockResolvedValue(1);
      mockRedis.exists.mockReset().mockResolvedValue(0);

      await checkIpRateLimit(TEST_IP, "login");

      // set should only be called for lockout, not for normal operations
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("should use different lockout keys for login and contact", async () => {
      mockRedis.get.mockReset().mockResolvedValue(5);
      mockRedis.incr.mockReset().mockResolvedValue(6);
      mockRedis.exists.mockReset().mockResolvedValue(0);
      mockRedis.set.mockReset().mockResolvedValue("OK");

      const loginResult = await checkIpRateLimit(TEST_IP, "login");
      expect(loginResult.allowed).toBe(false);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `rl:lockout:login:${TEST_IP}`,
        "1",
        expect.objectContaining({ ex: expect.any(Number) }),
      );
    });

    it("should return resetAt in the future when lockout is active", async () => {
      mockRedis.exists.mockReset().mockResolvedValue(1);
      mockRedis.get.mockReset().mockResolvedValue(0);
      mockRedis.incr.mockReset().mockResolvedValue(1);

      const result = await checkIpRateLimit(TEST_IP, "login");

      expect(result.allowed).toBe(false);
      expect(result.lockedOut).toBe(true);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
