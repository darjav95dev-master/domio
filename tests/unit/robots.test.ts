import { describe, it, expect, afterEach, vi } from "vitest";

const SITE_URL = "https://wedomio.com";

describe("robots configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe("en producción", () => {
    it("permite / y bloquea /panel y /api/internal", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_URL);
      vi.resetModules();
      const { default: robots } = await import("../../app/robots");
      const rule = robots().rules;

      expect(rule.userAgent).toBe("*");
      expect(rule.allow).toBe("/");
      expect(rule.disallow).toContain("/panel");
      expect(rule.disallow).toContain("/api/internal");
    });

    it("usa NEXT_PUBLIC_SITE_URL como host", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE_URL);
      vi.resetModules();
      const { default: robots } = await import("../../app/robots");
      expect(robots().host).toBe(SITE_URL);
    });
  });

  describe("fuera de producción (dev/local)", () => {
    it("bloquea TODO el sitio para no indexar el clon de desarrollo", async () => {
      vi.stubEnv("NEXT_PUBLIC_APP_ENV", "development");
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dev.wedomio.com");
      vi.resetModules();
      const { default: robots } = await import("../../app/robots");
      const rule = robots().rules;

      expect(rule.disallow).toBe("/");
      expect(rule.allow).toBeUndefined();
    });
  });
});
