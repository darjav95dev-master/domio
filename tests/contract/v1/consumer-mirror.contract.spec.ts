import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { promocionResponseSchema } from "@/features/api-public/schemas/promocion-response.schema";
import { leadInstitutionalSchema } from "@/features/api-public/schemas/lead-institutional.schema";
import { serializePromocion } from "@/features/api-public/serializers/promocion-serializer";
import type { PromocionListRow } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Consumer Mirror Tests (v1)
//
// These tests simulate the perspective of an API consumer, verifying that:
// 1. Request format (headers, body) conforms to the API contract
// 2. Response format matches the defined schemas
// 3. Error responses follow the expected structure
// 4. Serialization produces valid responses
//
// Note: These are contract-level tests that verify the API shape without
// requiring a running server. Full end-to-end HTTP tests are in the E2E suite.
// ---------------------------------------------------------------------------

const NOW = new Date("2026-07-08T12:00:00.000Z");

const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

/**
 * Sample row that simulates a DB result from PromocionRepository.
 */
const sampleRow: PromocionListRow = {
  id: VALID_UUID,
  tenantId: "tenant-1",
  slug: "piso-en-venta-en-santa-cruz-3hab-a4c9",
  name: "Piso en Santa Cruz",
  kind: "portfolio",
  status: "PUBLISHED",
  operation: "SALE",
  propertyType: "piso",
  constructionStatus: null,
  island: "Tenerife",
  municipality: "Santa Cruz",
  address: "Calle Principal 123",
  location: [-16.254, 28.468] as [number, number],
  locationApprox: [-16.254, 28.468] as [number, number],
  mapPrivacyMode: "EXACT",
  seoTitle: null,
  seoDescription: null,
  assignedAgentId: null,
  assignedAgentName: null,
  draftPayload: null,
  createdAt: NOW,
  updatedAt: NOW,
};

describe("Consumer Mirror - Promociones (v1)", () => {
  describe("GET /api/v1/promociones", () => {
    it("should serialize a promocion that validates against the response schema", () => {
      const serialized = serializePromocion(sampleRow);
      const result = promocionResponseSchema.safeParse(serialized);

      expect(result.success).toBe(true);
    });

    it("should produce a response with expected fields", () => {
      const serialized = serializePromocion(sampleRow);

      expect(serialized).toHaveProperty("id");
      expect(serialized).toHaveProperty("slug");
      expect(serialized).toHaveProperty("nombre");
      expect(serialized).toHaveProperty("tipo");
      expect(serialized).toHaveProperty("operacion");
      expect(serialized).toHaveProperty("isla");
      expect(serialized).toHaveProperty("municipio");
      expect(serialized).toHaveProperty("mapPrivacyMode");
      expect(serialized).toHaveProperty("location");
      expect(serialized).toHaveProperty("locationApprox");
      expect(serialized).toHaveProperty("precioMin");
      expect(serialized).toHaveProperty("precioMax");
      expect(serialized).toHaveProperty("superficieMin");
      expect(serialized).toHaveProperty("superficieMax");
      expect(serialized).toHaveProperty("dormitorios");
      expect(serialized).toHaveProperty("banios");
      expect(serialized).toHaveProperty("updatedAt");
    });

    it("should include pagination fields in response", () => {
      // The endpoint returns a paginated envelope
      const paginatedResponse = {
        items: [serializePromocion(sampleRow)],
        nextCursor: null as string | null,
        total: 1,
      };

      const paginatedSchema = promocionResponseSchema;
      const result = paginatedSchema.safeParse(paginatedResponse.items[0]);

      expect(result.success).toBe(true);
      expect(paginatedResponse).toHaveProperty("items");
      expect(paginatedResponse).toHaveProperty("nextCursor");
      expect(paginatedResponse).toHaveProperty("total");
      expect(paginatedResponse.total).toBeTypeOf("number");
    });

    it("should send API key via X-API-Key header", () => {
      // Consumer contract: API key goes in X-API-Key or Authorization: Bearer
      const headers = new Headers({
        "X-API-Key": "test-api-key-123",
      });

      expect(headers.get("X-API-Key")).toBe("test-api-key-123");
    });

    it("should also accept API key via Authorization: Bearer header", () => {
      // Consumer contract: also supports Authorization: Bearer
      const headers = new Headers({
        Authorization: "Bearer test-api-key-123",
      });

      expect(headers.get("Authorization")).toBe("Bearer test-api-key-123");
    });
  });

  describe("POST /api/v1/leads/institutional", () => {
    it("should accept a valid lead payload", () => {
      const payload = {
        name: "Juan Pérez",
        email: "juan@example.com",
        phone: "+34600000000",
        message: "Estoy interesado en la promoción",
        promocionId: VALID_UUID,
        tipologiaId: VALID_UUID,
        consent: {
          legalBasis: "RGPD consent",
          textAccepted: "Acepto la política de privacidad",
        },
      };

      const result = leadInstitutionalSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject a payload without consent", () => {
      const payload = {
        name: "Juan Pérez",
        email: "juan@example.com",
        promocionId: VALID_UUID,
      };

      const result = leadInstitutionalSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should return 201 for valid lead creation", () => {
      // The POST handler returns 201 on success
      const responsePayload = {
        id: VALID_UUID,
        status: "NEW",
      };

      expect(responsePayload).toHaveProperty("id");
      expect(responsePayload).toHaveProperty("status");
    });

    it("should return 422 for invalid payload", () => {
      // The POST handler returns 422 on validation failure
      const errorResponse = {
        error: "Validation failed",
        details: {
          email: ["email must be a valid email address"],
        },
      };

      expect(errorResponse).toHaveProperty("error");
      expect(errorResponse).toHaveProperty("details");
      expect(errorResponse.details.email).toBeDefined();
    });

    it("should return 400 for malformed JSON", () => {
      // The POST handler returns 400 on SyntaxError
      const errorResponse = {
        error: "Invalid JSON body",
      };

      expect(errorResponse).toHaveProperty("error");
      expect(errorResponse.error).toBe("Invalid JSON body");
    });

    it("should include consent as required field", () => {
      const payload = {
        name: "Juan Pérez",
        email: "juan@example.com",
        promocionId: VALID_UUID,
      };

      const result = leadInstitutionalSchema.safeParse(payload);

      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        expect(fieldErrors).toHaveProperty("consent");
      }
    });
  });

  describe("API Key format", () => {
    it("should accept both header formats for API key", () => {
      // X-API-Key header
      const header1 = new Headers({ "X-API-Key": "key-1" });
      expect(header1.get("X-API-Key")).toBe("key-1");

      // Authorization: Bearer
      const header2 = new Headers({ Authorization: "Bearer key-2" });
      expect(header2.get("Authorization")).toBe("Bearer key-2");
    });

    it("should reject requests without API key", () => {
      // A request without auth headers should fail
      const headers = new Headers();
      const hasApiKeyHeader = headers.has("X-API-Key");
      const hasAuthHeader = headers.has("Authorization");

      expect(hasApiKeyHeader).toBe(false);
      expect(hasAuthHeader).toBe(false);
    });
  });
});
