import { describe, it, expect } from "vitest";
import {
  createApiKeySchema,
  apiKeyFiltersSchema,
} from "@/shared/types/api-key-schema";

describe("createApiKeySchema", () => {
  it("accepts valid API key creation with name only", () => {
    const result = createApiKeySchema.safeParse({
      name: "My Integration Key",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rateLimitPerMin).toBe(60); // default
    }
  });

  it("accepts custom rate limit", () => {
    const result = createApiKeySchema.safeParse({
      name: "High Rate Key",
      rateLimitPerMin: 300,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rateLimitPerMin).toBe(300);
    }
  });

  it("rejects empty name", () => {
    const result = createApiKeySchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative rate limit", () => {
    const result = createApiKeySchema.safeParse({
      name: "Bad Key",
      rateLimitPerMin: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero rate limit", () => {
    const result = createApiKeySchema.safeParse({
      name: "Bad Key",
      rateLimitPerMin: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects excessively high rate limit", () => {
    const result = createApiKeySchema.safeParse({
      name: "Bad Key",
      rateLimitPerMin: 10001,
    });
    expect(result.success).toBe(false);
  });
});

describe("apiKeyFiltersSchema", () => {
  it("accepts valid filters", () => {
    const result = apiKeyFiltersSchema.safeParse({
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty filters", () => {
    const result = apiKeyFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts pagination params as strings (coerce)", () => {
    const result = apiKeyFiltersSchema.safeParse({
      page: "1",
      limit: "25",
    });
    expect(result.success).toBe(true);
  });
});
