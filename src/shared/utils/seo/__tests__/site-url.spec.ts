import { describe, it, expect, beforeEach } from "vitest";
import { getSiteUrl } from "../site-url";

// Store original env so we can restore between tests
const ORIGINAL_ENV = process.env;

const TEST_SITE_URL = "https://wedomio.com";
const LOCAL_FALLBACK = "http://localhost:3000";

describe("getSiteUrl", () => {
  beforeEach(() => {
    // Reset process.env for each test
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("returns NEXT_PUBLIC_SITE_URL when env var is set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = TEST_SITE_URL;
    expect(getSiteUrl()).toBe(TEST_SITE_URL);
  });

  it("falls back to http://localhost:3000 when env var is not set", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBe(LOCAL_FALLBACK);
  });

  it("returns http://localhost:3000 when env var is empty string", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "";
    expect(getSiteUrl()).toBe(LOCAL_FALLBACK);
  });

  it("strips trailing slash from URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = `${TEST_SITE_URL}/`;
    expect(getSiteUrl()).toBe(TEST_SITE_URL);
  });

  it("strips multiple trailing slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = `${TEST_SITE_URL}///`;
    expect(getSiteUrl()).toBe(TEST_SITE_URL);
  });

  it("handles URL with path (e.g. preview deployments)", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview-abc.domio.pages.dev";
    expect(getSiteUrl()).toBe("https://preview-abc.domio.pages.dev");
  });

  it("does not strip single trailing slash from root path", () => {
    process.env.NEXT_PUBLIC_SITE_URL = LOCAL_FALLBACK;
    expect(getSiteUrl()).toBe(LOCAL_FALLBACK);
  });
});
