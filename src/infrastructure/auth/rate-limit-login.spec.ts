import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkLoginRateLimit } from "./rate-limit-login";
import { extractIpFromHeaders } from "@/shared/utils/extract-ip";

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

// ─── Constants ───────────────────────────────────────────────────────────────

const TEST_IP = "203.0.113.42";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("extractIpFromHeaders", () => {
  it("should extract IP from x-forwarded-for header", () => {
    const headers = new Headers({ "x-forwarded-for": TEST_IP });
    expect(extractIpFromHeaders(headers)).toBe(TEST_IP);
  });

  it("should take the last IP from a comma-separated x-forwarded-for (real client behind proxy)", () => {
    const headers = new Headers({ "x-forwarded-for": `198.51.100.7, 10.0.0.1, ${TEST_IP}` });
    expect(extractIpFromHeaders(headers)).toBe(TEST_IP);
  });

  it("should fall back to x-real-ip when x-forwarded-for is missing", () => {
    const secondaryIp = "198.51.100.7";
    const headers = new Headers({ "x-real-ip": secondaryIp });
    expect(extractIpFromHeaders(headers)).toBe(secondaryIp);
  });

  it("should return 'unknown' when no IP header is present", () => {
    const headers = new Headers({});
    expect(extractIpFromHeaders(headers)).toBe("unknown");
  });
});

describe("checkLoginRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RATE_LIMIT_STORE_URL", "https://test.upstash.io");
  });

  it("should return null when login is allowed", async () => {
    mockRedis.get.mockReset().mockResolvedValue(0);
    mockRedis.incr.mockReset().mockResolvedValue(1);
    mockRedis.exists.mockReset().mockResolvedValue(0);

    const headers = new Headers({ "x-forwarded-for": TEST_IP });

    const result = await checkLoginRateLimit(headers);
    expect(result).toBeNull();
  });

  it("should return 429 response when login is rate limited", async () => {
    mockRedis.get.mockReset().mockResolvedValue(5);
    mockRedis.incr.mockReset().mockResolvedValue(6);
    mockRedis.exists.mockReset().mockResolvedValue(0);
    mockRedis.set.mockReset().mockResolvedValue("OK");

    const headers = new Headers({ "x-forwarded-for": TEST_IP });

    const result = await checkLoginRateLimit(headers);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("should return 429 response when IP is locked out", async () => {
    mockRedis.exists.mockReset().mockResolvedValue(1);
    mockRedis.get.mockReset().mockResolvedValue(0);
    mockRedis.incr.mockReset().mockResolvedValue(1);

    const headers = new Headers({ "x-forwarded-for": TEST_IP });

    const result = await checkLoginRateLimit(headers);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);

    const body = await result!.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("retryAfter");
  });

  it("should use 'unknown' as fallback IP when headers are empty", async () => {
    mockRedis.get.mockReset().mockResolvedValue(0);
    mockRedis.incr.mockReset().mockResolvedValue(1);
    mockRedis.exists.mockReset().mockResolvedValue(0);

    const headers = new Headers({});

    const result = await checkLoginRateLimit(headers);
    expect(result).toBeNull(); // allowed, no limit reached
  });
});
