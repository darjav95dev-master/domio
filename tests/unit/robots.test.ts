import { describe, it, expect, afterEach, vi } from "vitest";

const SITE_URL = "https://domio.com";

describe("robots configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should block /panel and /api/internal", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_URL);
    const { default: robots } = await import("../../app/robots");
    const result = robots();

    expect(result.rules).toBeDefined();
    const rule = result.rules;
    expect(rule.userAgent).toBe("*");
    expect(rule.disallow).toContain("/panel");
    expect(rule.disallow).toContain("/api/internal");
  });

  it("should allow / (implicit)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_URL);
    const { default: robots } = await import("../../app/robots");
    const result = robots();

    expect(result.rules.disallow).toContain("/panel");
    expect(result.rules.disallow).toContain("/api/internal");
  });

  it("should use NEXT_PUBLIC_SITE_URL as host", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_URL);
    const { default: robots } = await import("../../app/robots");
    const result = robots();
    expect(result.host).toBe(SITE_URL);
  });

  it("should fallback to localhost when env var is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    const { default: robots } = await import("../../app/robots");
    const result = robots();
    expect(result.host).toBe("http://localhost:3000");
  });
});
