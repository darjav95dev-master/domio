import { describe, it, expect } from "vitest";
import { API_KEY_HEADER } from "@/shared/constants/tenant-hosts";

describe("context-middleware", () => {
  describe("ContextResolutionError", () => {
    it("creates an error with the given message and status", async () => {
      const { ContextResolutionError } = await import(
        "@/infrastructure/tenant/context-middleware"
      );

      const error = new ContextResolutionError("Not found", 404);

      expect(error.message).toBe("Not found");
      expect(error.status).toBe(404);
      expect(error.name).toBe("ContextResolutionError");
    });
  });

  describe("extractApiKey", () => {
    it("extracts API key from x-api-key header", async () => {
      const { extractApiKey } = await import(
        "@/infrastructure/tenant/context-middleware"
      );

      const result = extractApiKey({
        get: (name: string) => (name === API_KEY_HEADER ? "my-api-key" : null),
      });

      expect(result).toBe("my-api-key");
    });

    it("extracts API key from Authorization Bearer header", async () => {
      const { extractApiKey } = await import(
        "@/infrastructure/tenant/context-middleware"
      );

      const result = extractApiKey({
        get: (name: string) =>
          name === "authorization" ? "Bearer bearer-key" : null,
      });

      expect(result).toBe("bearer-key");
    });

    it("returns null when no API key is present", async () => {
      const { extractApiKey } = await import(
        "@/infrastructure/tenant/context-middleware"
      );

      const result = extractApiKey({
        get: () => null,
      });

      expect(result).toBeNull();
    });

    it("prefers Authorization Bearer over x-api-key header", async () => {
      const { extractApiKey } = await import(
        "@/infrastructure/tenant/context-middleware"
      );

      const result = extractApiKey({
        get: (name: string) => {
          if (name === API_KEY_HEADER) return "x-api-key-value";
          if (name === "authorization") return "Bearer bearer-value";
          return null;
        },
      });

      expect(result).toBe("bearer-value");
    });
  });
});
