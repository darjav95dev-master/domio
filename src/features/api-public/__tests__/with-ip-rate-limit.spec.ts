import { describe, it, expect, vi, beforeEach } from "vitest";

const mockConsume = vi.fn();

vi.mock("@/infrastructure/rate-limiting/rate-limiter.factory", () => ({
  createRateLimiter: () => ({ consume: mockConsume }),
}));

import { applyPublicApiIpRateLimit } from "../with-ip-rate-limit";
import { PUBLIC_API_IP_MAX_PER_MIN } from "@/shared/constants/rate-limits";

const TEST_IP = "203.0.113.42"; // rango de documentación (RFC 5737)

function req(headers: Record<string, string> = {}): Request {
  return new Request("https://api.test/api/v1/promociones", { headers });
}

describe("applyPublicApiIpRateLimit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keys the limiter by the client IP with the public-api limit", async () => {
    mockConsume.mockResolvedValue({
      allowed: true,
      remaining: 119,
      limit: PUBLIC_API_IP_MAX_PER_MIN,
      resetAt: new Date(),
    });

    const out = await applyPublicApiIpRateLimit(req({ "x-real-ip": TEST_IP }));

    expect(out.allowed).toBe(true);
    expect(mockConsume).toHaveBeenCalledWith(
      `ip:public-api:${TEST_IP}`,
      expect.objectContaining({ limit: PUBLIC_API_IP_MAX_PER_MIN }),
    );
  });

  it("returns not allowed when the window is exhausted (no lockout)", async () => {
    mockConsume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: PUBLIC_API_IP_MAX_PER_MIN,
      resetAt: new Date(),
    });

    const out = await applyPublicApiIpRateLimit(req({ "x-real-ip": TEST_IP }));

    expect(out.allowed).toBe(false);
  });
});
