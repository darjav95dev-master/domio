import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const ENV_EXAMPLE_PATH = resolve(ROOT, ".env.example");

const REQUIRED_VARIABLES = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "RESEND_API_KEY",
  "SENTRY_DSN",
  "RATE_LIMIT_STORE_URL",
];

const SUSPECT_SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{10,}/,
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*/,
  /[a-f0-9]{32,}/i,
  /[A-Za-z0-9/+=]{40,}/,
];

describe(".env.example", () => {
  it("exists at the repository root", () => {
    expect(() => readFileSync(ENV_EXAMPLE_PATH, "utf-8")).not.toThrow();
  });

  it("declares all required environment variables", () => {
    const content = readFileSync(ENV_EXAMPLE_PATH, "utf-8");

    for (const variable of REQUIRED_VARIABLES) {
      expect(content).toContain(variable);
    }
  });

  it("does not contain real-looking secrets", () => {
    const content = readFileSync(ENV_EXAMPLE_PATH, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      if (!line.includes("=")) continue;

      const value = line.split("=")[1] ?? "";
      for (const pattern of SUSPECT_SECRET_PATTERNS) {
        expect(value).not.toMatch(pattern);
      }
    }
  });
});
