import { describe, it, expect, vi, beforeEach } from "vitest";
import { promocionResponseSchema } from "@/features/api-public/schemas/promocion-response.schema";
import { leadInstitutionalSchema } from "@/features/api-public/schemas/lead-institutional.schema";
import { serializePromocion } from "@/features/api-public/serializers/promocion-serializer";
import type { PromocionListRow } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Consumer Mirror Tests (v1)
//
// These tests simulate the perspective of an API consumer, verifying that:
// 1. Serialization produces valid responses matching the defined schemas
// 2. Schema validation works for both valid and invalid payloads
// 3. The handler-level contract is respected (auth, rate limiting, response
//    format) by calling the real handler with mocked dependencies.
//
// Handler tests mock the auth/business-logic layer to verify that the
// route handler produces the correct HTTP contract (status codes, response
// format, header structure) without requiring a real database.
// ---------------------------------------------------------------------------

const NOW = new Date("2026-07-08T12:00:00.000Z");
const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const PROMOCIONES_URL = "https://domio.com/api/v1/promociones";
// Lead fixture data extracted to avoid sonarjs/no-duplicate-string

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

// ---------------------------------------------------------------------------
// Handler contract tests — mocks
// ---------------------------------------------------------------------------
const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const API_KEY_ID = "key-001";

const mockValidateApiKey = vi.hoisted(() => vi.fn());
const mockApplyRateLimit = vi.hoisted(() => vi.fn());
const mockGetPromociones = vi.hoisted(() => vi.fn());

vi.mock("@/features/api-public/middleware/api-key-auth", () => ({
  validateApiKey: mockValidateApiKey,
}));

vi.mock("@/features/api-public/with-rate-limit", () => ({
  applyRateLimit: mockApplyRateLimit,
}));

vi.mock("@/features/api-public/server/get-promociones", () => ({
  getPromociones: mockGetPromociones,
}));

// SUT import — must be after vi.mock but as regular top-level import
import { GET } from "@app/api/v1/promociones/route";
import { ContextResolutionError } from "@/infrastructure/tenant/context-middleware";

// ---------------------------------------------------------------------------
// Schema contract: Promociones (no mocking needed)
// ---------------------------------------------------------------------------
describe("Consumer Mirror - Promociones (v1)", () => {
  describe("GET /api/v1/promociones — serialization contract", () => {
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
      const paginatedResponse = {
        items: [serializePromocion(sampleRow)],
        nextCursor: null as string | null,
        total: 1,
      };

      const result = promocionResponseSchema.safeParse(paginatedResponse.items[0]);
      expect(result.success).toBe(true);

      expect(paginatedResponse).toHaveProperty("items");
      expect(paginatedResponse).toHaveProperty("nextCursor");
      expect(paginatedResponse).toHaveProperty("total");
      expect(paginatedResponse.total).toBeTypeOf("number");
    });
  });

  // ---------------------------------------------------------------------------
  // Handler contract: Promociones (with mocked auth/business-logic)
  // ---------------------------------------------------------------------------
  describe("GET /api/v1/promociones — handler contract", () => {
    beforeEach(() => {
      vi.clearAllMocks();

      mockValidateApiKey.mockResolvedValue({
        type: "apikey",
        apiKeyId: API_KEY_ID,
        rateLimitPerMin: 60,
        getTenantId: () => TENANT_ID,
        withTransaction: vi.fn(),
      });

      mockApplyRateLimit.mockResolvedValue({
        allowed: true,
        result: {
          allowed: true,
          remaining: 59,
          limit: 60,
          resetAt: new Date(Date.now() + 60_000),
        },
      });

      mockGetPromociones.mockResolvedValue({
        items: [sampleRow],
        nextCursor: null,
        total: 1,
      });
    });

    it("should return 200 with paginated promociones when authenticated", async () => {
      const request = new Request(PROMOCIONES_URL, {
        headers: { "x-api-key": "valid-key" },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("items");
      expect(body).toHaveProperty("nextCursor");
      expect(body).toHaveProperty("total");
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.total).toBe(1);
    });

    it("should return 401 when no API key is provided", async () => {
      mockValidateApiKey.mockRejectedValue(
        new ContextResolutionError("Missing API key", 401),
      );

      const request = new Request(PROMOCIONES_URL);
      const response = await GET(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it("should include X-RateLimit-* headers on successful response", async () => {
      const request = new Request(PROMOCIONES_URL, {
        headers: { "x-api-key": "valid-key" },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("X-RateLimit-Limit")).toBe("60");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("59");
      expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Schema contract: Leads (no mocking needed)
// ---------------------------------------------------------------------------
describe("Consumer Mirror - Leads (v1)", () => {
  describe("POST /api/v1/leads/institutional — schema contract", () => {
    const leadPayload = {
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
    } as const;

    const leadPayloadMinimal = {
      name: leadPayload.name,
      email: leadPayload.email,
      promocionId: leadPayload.promocionId,
    };

    it("should accept a valid lead payload", () => {
      const result = leadInstitutionalSchema.safeParse(leadPayload);
      expect(result.success).toBe(true);
    });

    it("should reject a payload without consent", () => {
      const result = leadInstitutionalSchema.safeParse(leadPayloadMinimal);
      expect(result.success).toBe(false);
    });

    it("should include consent as required field in error details", () => {
      const result = leadInstitutionalSchema.safeParse(leadPayloadMinimal);
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        expect(fieldErrors).toHaveProperty("consent");
      }
    });

    it("should reject payload with empty legalBasis in consent", () => {
      const result = leadInstitutionalSchema.safeParse({
        ...leadPayloadMinimal,
        consent: { legalBasis: "", textAccepted: "Acepto" },
      });
      expect(result.success).toBe(false);
    });

    it("should accept payload without optional fields (phone, message, tipologiaId)", () => {
      const minimal = { ...leadPayloadMinimal, consent: leadPayload.consent };
      const result = leadInstitutionalSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });
  });
});
