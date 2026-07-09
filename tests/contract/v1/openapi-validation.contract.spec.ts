import { describe, it, expect } from "vitest";
import { generateOpenAPISpec } from "@/features/api-public/openapi/generate-openapi";

type OpenAPISpec = Record<string, unknown>;

describe("OpenAPI Spec Validation (v1)", () => {
  let spec: OpenAPISpec;

  it("should generate a spec without error", () => {
    expect(() => {
      spec = generateOpenAPISpec();
    }).not.toThrow();
  });

  describe("Spec structure", () => {
    it("should be OpenAPI 3.0.x", () => {
      spec = generateOpenAPISpec();
      expect(spec.openapi).toBeDefined();
      expect(typeof spec.openapi).toBe("string");
      expect((spec.openapi as string).startsWith("3.0")).toBe(true);
    });

    it("should have an info object with title and version", () => {
      spec = generateOpenAPISpec();
      expect(spec.info).toBeDefined();
      expect((spec.info as Record<string, unknown>).title).toBe("Domio API v1");
      expect((spec.info as Record<string, unknown>).version).toBe("1.0.0");
    });

    it("should have a paths object", () => {
      spec = generateOpenAPISpec();
      expect(spec.paths).toBeDefined();
      expect(typeof spec.paths).toBe("object");
    });
  });

  describe("API v1 paths", () => {
    it("should include GET /api/v1/promociones", () => {
      spec = generateOpenAPISpec();
      const paths = spec.paths as Record<string, unknown>;
      expect(paths["/api/v1/promociones"]).toBeDefined();

      const promocionesPath = paths["/api/v1/promociones"] as Record<
        string,
        unknown
      >;
      expect(promocionesPath.get).toBeDefined();
    });

    it("should include POST /api/v1/leads/institutional", () => {
      spec = generateOpenAPISpec();
      const paths = spec.paths as Record<string, unknown>;
      expect(paths["/api/v1/leads/institutional"]).toBeDefined();

      const leadsPath = paths["/api/v1/leads/institutional"] as Record<
        string,
        unknown
      >;
      expect(leadsPath.post).toBeDefined();
    });

    it("GET /api/v1/promociones should have 200 response with paginated schema", () => {
      spec = generateOpenAPISpec();
      const paths = spec.paths as Record<string, unknown>;
      const promocionesPath = paths["/api/v1/promociones"] as Record<
        string,
        unknown
      >;
      const getOp = promocionesPath.get as Record<string, unknown>;
      const responses = getOp.responses as Record<string, unknown>;
      const response200 = responses["200"] as Record<string, unknown>;

      expect(response200).toBeDefined();
      expect(response200.description).toBeDefined();

      const content = response200.content as Record<string, unknown>;
      const jsonContent = content["application/json"] as Record<
        string,
        unknown
      >;
      expect(jsonContent.schema).toBeDefined();
    });

    it("POST /api/v1/leads/institutional should have 201 and 422 responses", () => {
      spec = generateOpenAPISpec();
      const paths = spec.paths as Record<string, unknown>;
      const leadsPath = paths["/api/v1/leads/institutional"] as Record<
        string,
        unknown
      >;
      const postOp = leadsPath.post as Record<string, unknown>;
      const responses = postOp.responses as Record<string, unknown>;

      expect(responses["201"]).toBeDefined();
      expect(responses["422"]).toBeDefined();
      expect(responses["400"]).toBeDefined();
      expect(responses["429"]).toBeDefined();
    });
  });

  describe("Security scheme", () => {
    it("should define an API key security scheme", () => {
      spec = generateOpenAPISpec();
      const components = spec.components as Record<string, unknown>;
      const securitySchemes = components.securitySchemes as Record<
        string,
        unknown
      >;

      expect(securitySchemes).toBeDefined();
      expect(securitySchemes.apiKey).toBeDefined();

      const apiKeyScheme = securitySchemes.apiKey as Record<string, unknown>;
      expect(apiKeyScheme.type).toBe("apiKey");
      expect(apiKeyScheme.in).toBe("header");
    });
  });

  describe("Components schemas", () => {
    it("should have registered PromocionResponse schema", () => {
      spec = generateOpenAPISpec();
      const components = spec.components as Record<string, unknown>;
      const schemas = components.schemas as Record<string, unknown>;

      expect(schemas.PromocionResponse).toBeDefined();
    });

    it("should have registered LeadInstitutionalInput schema", () => {
      spec = generateOpenAPISpec();
      const components = spec.components as Record<string, unknown>;
      const schemas = components.schemas as Record<string, unknown>;

      expect(schemas.LeadInstitutionalInput).toBeDefined();
    });
  });

  describe("Servers and tags", () => {
    it("should have at least one server URL", () => {
      spec = generateOpenAPISpec();
      expect(spec.servers).toBeDefined();
      expect(Array.isArray(spec.servers)).toBe(true);
      expect((spec.servers as Array<unknown>).length).toBeGreaterThanOrEqual(1);
    });

    it("should have tags for Promociones and Leads", () => {
      spec = generateOpenAPISpec();
      expect(spec.tags).toBeDefined();
      const tags = spec.tags as Array<{ name: string; description: string }>;
      const tagNames = tags.map((t) => t.name);

      expect(tagNames).toContain("Promociones");
      expect(tagNames).toContain("Leads");
    });
  });
});
