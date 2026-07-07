import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const R2_ENV_VARS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
] as const;

describe("media env validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function setValidEnv(): void {
    process.env.R2_ACCOUNT_ID = "test-account-id";
    process.env.R2_ACCESS_KEY_ID = "test-access-key";
    process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
    process.env.R2_BUCKET = "test-bucket";
    process.env.R2_PUBLIC_URL = "https://test.example.com";
  }

  it("accepts all required R2 environment variables", async () => {
    setValidEnv();

    const { mediaEnv } = await import("@/infrastructure/media/env");

    expect(mediaEnv.R2_ACCOUNT_ID).toBe("test-account-id");
    expect(mediaEnv.R2_ACCESS_KEY_ID).toBe("test-access-key");
    expect(mediaEnv.R2_SECRET_ACCESS_KEY).toBe("test-secret-key");
    expect(mediaEnv.R2_BUCKET).toBe("test-bucket");
    expect(mediaEnv.R2_PUBLIC_URL).toBe("https://test.example.com");
  });

  it.each(R2_ENV_VARS)(
    "throws when %s is missing on first property access",
    async (varName) => {
      setValidEnv();
      delete process.env[varName];

      const { mediaEnv } = await import("@/infrastructure/media/env");

      expect(() => mediaEnv[varName]).toThrow(
        `${varName} environment variable is not defined`,
      );
    },
  );
});
