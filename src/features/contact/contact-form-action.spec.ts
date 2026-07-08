import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkContactRateLimit } from "./contact-form-action";

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

describe("checkContactRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RATE_LIMIT_STORE_URL", "https://test.upstash.io");
  });

  it("should return allowed when under the contact limit", async () => {
    mockRedis.get.mockReset().mockResolvedValue(0);
    mockRedis.incr.mockReset().mockResolvedValue(1);
    mockRedis.exists.mockReset().mockResolvedValue(0);

    const headers = new Headers({ "x-forwarded-for": TEST_IP });
    const result = await checkContactRateLimit(headers);

    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should return denied with error when over the contact limit", async () => {
    mockRedis.get.mockReset().mockResolvedValue(3);
    mockRedis.incr.mockReset().mockResolvedValue(4);
    mockRedis.exists.mockReset().mockResolvedValue(0);
    mockRedis.set.mockReset().mockResolvedValue("OK");

    const headers = new Headers({ "x-forwarded-for": TEST_IP });
    const result = await checkContactRateLimit(headers);

    expect(result.allowed).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("should return denied when IP is locked out", async () => {
    mockRedis.exists.mockReset().mockResolvedValue(1);
    mockRedis.get.mockReset().mockResolvedValue(0);
    mockRedis.incr.mockReset().mockResolvedValue(1);

    const headers = new Headers({ "x-forwarded-for": TEST_IP });
    const result = await checkContactRateLimit(headers);

    expect(result.allowed).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("should use 'unknown' as fallback IP when no IP headers are present", async () => {
    mockRedis.get.mockReset().mockResolvedValue(0);
    mockRedis.incr.mockReset().mockResolvedValue(1);
    mockRedis.exists.mockReset().mockResolvedValue(0);

    const headers = new Headers({});
    const result = await checkContactRateLimit(headers);

    expect(result.allowed).toBe(true);
  });
});
