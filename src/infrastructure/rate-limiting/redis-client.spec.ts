import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedisConstructor = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: mockRedisConstructor,
}));

const TEST_URL = "https://test.upstash.io";
const TEST_TOKEN = "test-token";

describe("getRedisClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    // Reset module registry so singleton is fresh each test
    vi.resetModules();
  });

  it("returns null when RATE_LIMIT_STORE_URL is not set", async () => {
    const { getRedisClient } = await import("./redis-client");
    expect(getRedisClient()).toBeNull();
  });

  it("creates Redis client when RATE_LIMIT_STORE_URL is set", async () => {
    vi.stubEnv("RATE_LIMIT_STORE_URL", TEST_URL);
    vi.stubEnv("RATE_LIMIT_STORE_TOKEN", TEST_TOKEN);

    const { getRedisClient } = await import("./redis-client");
    const client = getRedisClient();

    expect(client).not.toBeNull();
    expect(mockRedisConstructor).toHaveBeenCalledWith({
      url: TEST_URL,
      token: TEST_TOKEN,
    });
  });

  it("returns the same singleton instance on subsequent calls", async () => {
    vi.stubEnv("RATE_LIMIT_STORE_URL", TEST_URL);
    vi.stubEnv("RATE_LIMIT_STORE_TOKEN", TEST_TOKEN);

    const { getRedisClient } = await import("./redis-client");
    const client1 = getRedisClient();
    const client2 = getRedisClient();

    expect(mockRedisConstructor).toHaveBeenCalledTimes(1);
    expect(client1).toBe(client2);
  });
});
