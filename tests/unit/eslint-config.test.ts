import { describe, expect, it } from "vitest";
import type { Linter } from "eslint";

describe("ESLint flat config", () => {
  it("loads the flat config module as an array", async () => {
    const configModule = await import("../../eslint.config.mjs");

    expect(configModule.default).toBeDefined();
    expect(Array.isArray(configModule.default)).toBe(true);
  });

  it("activates sonarjs rules (cognitive-complexity, no-duplicate-string, no-identical-functions)", async () => {
    const { ESLint } = await import("eslint");
    const { default: config } = await import("../../eslint.config.mjs");

    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: config as Linter.Config[],
    });

    const calculated = await eslint.calculateConfigForFile("app/page.tsx");

    expect(calculated.rules["sonarjs/cognitive-complexity"]).toBeDefined();
    expect(calculated.rules["sonarjs/cognitive-complexity"][0]).toBeOneOf([
      "error",
      2,
    ]);
    expect(calculated.rules["sonarjs/no-duplicate-string"]).toBeDefined();
    expect(calculated.rules["sonarjs/no-duplicate-string"][0]).toBeOneOf([
      "error",
      2,
    ]);
    expect(calculated.rules["sonarjs/no-identical-functions"]).toBeDefined();
    expect(
      calculated.rules["sonarjs/no-identical-functions"][0],
    ).toBeOneOf(["error", 2]);
  });

  it("enables jsx-a11y recommended rules", async () => {
    const { ESLint } = await import("eslint");
    const { default: config } = await import("../../eslint.config.mjs");

    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: config as Linter.Config[],
    });

    const calculated = await eslint.calculateConfigForFile("app/page.tsx");

    expect(calculated.rules["jsx-a11y/alt-text"]).toBeDefined();
  });
});
