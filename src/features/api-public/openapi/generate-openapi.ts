import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { promocionResponseSchema } from "@/features/api-public/schemas/promocion-response.schema";
import { leadInstitutionalSchema } from "@/features/api-public/schemas/lead-institutional.schema";

/**
 * Builds and returns the OpenAPI 3.0 document for the Domio API v1.
 *
 * Component schemas for PromocionResponse, PromocionListResponse and
 * LeadInstitutionalInput are auto-generated from the zod versioned schemas
 * via `z.toJSONSchema()` (zod v4 built-in). This guarantees that any change
 * to the zod schema is reflected in the OpenAPI spec without manual
 * intervention (FR-007).
 *
 * Auxiliary schemas (ErrorResponse, RateLimitErrorResponse, etc.) are
 * defined inline as they have no corresponding zod schema -- they are
 * generic error envelopes unlikely to diverge.
 */
export function generateOpenAPISpec(): Record<string, unknown> {
  const registry = new OpenAPIRegistry();

  // ── Register component schemas ──────────────────────────────────
  // Auto-generated from zod versioned schemas (FR-007)
  // Cast to Record because zod's JSONSchema type (draft 2020-12) is structurally
  // compatible but not assignable to @asteasolutions/zod-to-openapi's SchemaObject.
  const promocionJsonSchema = promocionResponseSchema.toJSONSchema() as unknown as Record<string, unknown>;
  registry.registerComponent("schemas", "PromocionResponse", {
    ...promocionJsonSchema,
    description: "A published portfolio promocion response derived from promocionResponseSchema",
  });

  registry.registerComponent("schemas", "PromocionListResponse", {
    type: "object",
    description: "Paginated list of promociones",
    properties: {
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/PromocionResponse" },
      },
      nextCursor: {
        type: "string",
        nullable: true,
        description: "Cursor for the next page (null if last page)",
      },
      total: {
        type: "integer",
        description: "Total number of items matching the query",
      },
    },
    required: ["items", "nextCursor", "total"],
  });

  const leadJsonSchema = leadInstitutionalSchema.toJSONSchema() as unknown as Record<string, unknown>;
  registry.registerComponent("schemas", "LeadInstitutionalInput", {
    ...leadJsonSchema,
    description: "Institutional lead creation payload derived from leadInstitutionalSchema",
  });

  registry.registerComponent("schemas", "LeadInstitutionalResponse", {
    type: "object",
    description: "Lead creation response",
    properties: {
      id: { type: "string", format: "uuid", description: "Created lead UUID" },
      status: { type: "string", description: "Lead status" },
    },
    required: ["id", "status"],
  });

  // Constants to avoid sonarjs/no-duplicate-string in structural OpenAPI boilerplate
  const ERR_MSG_DESC = "Error message";
  const ERR_RESPONSE_REF = { $ref: "#/components/schemas/ErrorResponse" } as const;

  registry.registerComponent("schemas", "ErrorResponse", {
    type: "object",
    description: "Generic error response",
    properties: {
      error: { type: "string", description: ERR_MSG_DESC },
    },
    required: ["error"],
  });

  registry.registerComponent("schemas", "RateLimitErrorResponse", {
    type: "object",
    description: "Rate limit exceeded response",
    properties: {
      error: { type: "string", description: ERR_MSG_DESC },
      retryAfter: {
        type: "integer",
        description: "Seconds to wait before retrying",
      },
    },
    required: ["error", "retryAfter"],
  });

  registry.registerComponent("schemas", "ValidationErrorResponse", {
    type: "object",
    description: "Validation error response",
    properties: {
      error: { type: "string", description: ERR_MSG_DESC },
      details: {
        type: "object",
        description: "Field-level validation errors",
        additionalProperties: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    required: ["error"],
  });

  // ── GET /api/v1/promociones ────────────────────────────────────
  registry.registerPath({
    method: "get",
    path: "/api/v1/promociones",
    summary: "List published portfolio promociones",
    description:
      "Returns a cursor-paginated list of published portfolio promociones. " +
      "Requires API key authentication via X-API-Key or Authorization: Bearer header. " +
      "Rate limited per API key.",
    tags: ["Promociones"],
    security: [{ apiKey: [] }],
    parameters: [
      {
        name: "cursor",
        in: "query",
        required: false,
        schema: { type: "string" },
        description: "Cursor for pagination (from previous response nextCursor)",
      },
      {
        name: "limit",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1, maximum: 100 },
        description: "Number of items per page (default: 20, max: 100)",
      },
    ],
    responses: {
      "200": {
        description: "Paginated list of promociones",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/PromocionListResponse",
            },
          },
        },
        headers: {
          "X-RateLimit-Limit": {
            schema: { type: "integer" },
            description: "Rate limit quota",
          },
          "X-RateLimit-Remaining": {
            schema: { type: "integer" },
            description: "Remaining requests in the current window",
          },
          "X-RateLimit-Reset": {
            schema: { type: "integer" },
            description: "Unix timestamp when the rate limit resets",
          },
        },
      },
      "401": {
        description: "Missing API key",
        content: {
          "application/json": {
            schema: ERR_RESPONSE_REF,
          },
        },
      },
      "403": {
        description: "Invalid or revoked API key",
        content: {
          "application/json": {
            schema: ERR_RESPONSE_REF,
          },
        },
      },
      "429": {
        description: "Rate limit exceeded",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RateLimitErrorResponse" },
          },
        },
      },
    },
  });

  // ── POST /api/v1/leads/institutional ───────────────────────────
  registry.registerPath({
    method: "post",
    path: "/api/v1/leads/institutional",
    summary: "Create an institutional lead",
    description:
      "Creates a new institutional lead with RGPD consent. " +
      "The consent object is mandatory (legalBasis + textAccepted). " +
      "Phone, message, and tipologiaId are optional. " +
      "Requires API key authentication. Rate limited per API key.",
    tags: ["Leads"],
    security: [{ apiKey: [] }],
    request: {
      body: {
        description: "Lead institutional payload with consent",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/LeadInstitutionalInput",
            },
          },
        },
        required: true,
      },
    },
    responses: {
      "201": {
        description: "Lead created successfully",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/LeadInstitutionalResponse",
            },
          },
        },
        headers: {
          "X-RateLimit-Limit": {
            schema: { type: "integer" },
            description: "Rate limit quota",
          },
          "X-RateLimit-Remaining": {
            schema: { type: "integer" },
            description: "Remaining requests in the current window",
          },
          "X-RateLimit-Reset": {
            schema: { type: "integer" },
            description: "Unix timestamp when the rate limit resets",
          },
        },
      },
      "400": {
        description: "Invalid JSON body",
        content: {
          "application/json": {
            schema: ERR_RESPONSE_REF,
          },
        },
      },
      "401": {
        description: "Missing API key",
        content: {
          "application/json": {
            schema: ERR_RESPONSE_REF,
          },
        },
      },
      "403": {
        description: "Invalid or revoked API key",
        content: {
          "application/json": {
            schema: ERR_RESPONSE_REF,
          },
        },
      },
      "422": {
        description: "Validation failed (invalid payload, missing consent)",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ValidationErrorResponse",
            },
          },
        },
      },
      "429": {
        description: "Rate limit exceeded",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/RateLimitErrorResponse" },
          },
        },
      },
    },
  });

  // ── Security scheme ────────────────────────────────────────────
  registry.registerComponent("securitySchemes", "apiKey", {
    type: "apiKey",
    in: "header",
    name: "X-API-Key",
    description:
      "API key authentication. Pass the key via X-API-Key header or Authorization: Bearer <key>.",
  });

  // ── Generate document ──────────────────────────────────────────
  const generator = new OpenApiGeneratorV3(registry.definitions);

  const document = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Domio API v1",
      version: "1.0.0",
      description:
        "Domio public API for institutional portfolio consumption. " +
        "Provides read access to published promociones and write access for institutional lead creation.",
      contact: {
        name: "Domio Team",
      },
    },
    servers: [
      {
        url: "https://domio.com",
        description: "Production server",
      },
      {
        url: "http://localhost:3000",
        description: "Local development",
      },
    ],
    tags: [
      {
        name: "Promociones",
        description: "Catalog endpoints for published portfolio promociones",
      },
      {
        name: "Leads",
        description: "Lead creation and management endpoints",
      },
    ],
  });

  return document as unknown as Record<string, unknown>;
}
