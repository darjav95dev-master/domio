import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

/**
 * Builds and returns the OpenAPI 3.0 document for the Domio API v1.
 *
 * Uses raw OpenAPI component registration to avoid the need for
 * `extendZodWithOpenApi` (which would require modifying zod's prototype
 * before schema creation). The schema details are defined manually in
 * OpenAPI format, which is more explicit and avoids coupling to zod v4's
 * prototype extension mechanism.
 */
export function generateOpenAPISpec(): Record<string, unknown> {
  const registry = new OpenAPIRegistry();

  // ── Register component schemas ──────────────────────────────────
  registry.registerComponent("schemas", "PromocionResponse", {
    type: "object",
    description: "A published portfolio promocion response",
    properties: {
      id: { type: "string", format: "uuid", description: "Promocion UUID" },
      slug: { type: "string", description: "URL-friendly slug" },
      nombre: { type: "string", description: "Promocion name" },
      tipo: { type: "string", nullable: true, description: "Property type" },
      operacion: {
        type: "string",
        nullable: true,
        description: "Operation type (SALE/RENT)",
      },
      isla: { type: "string", nullable: true, description: "Island" },
      municipio: {
        type: "string",
        nullable: true,
        description: "Municipality",
      },
      mapPrivacyMode: {
        type: "string",
        enum: ["EXACT", "AREA"],
        description: "Map privacy mode",
      },
      location: {
        type: "object",
        description: "Exact location (omitted when mapPrivacyMode=AREA)",
        properties: {
          lat: { type: "number" },
          lng: { type: "number" },
        },
        required: ["lat", "lng"],
      },
      locationApprox: {
        type: "object",
        description: "Approximate location (centroid of municipality)",
        properties: {
          lat: { type: "number" },
          lng: { type: "number" },
        },
        required: ["lat", "lng"],
      },
      precioMin: {
        type: "number",
        nullable: true,
        description: "Minimum price (EUR)",
      },
      precioMax: {
        type: "number",
        nullable: true,
        description: "Maximum price (EUR)",
      },
      superficieMin: {
        type: "number",
        nullable: true,
        description: "Minimum surface area (m2)",
      },
      superficieMax: {
        type: "number",
        nullable: true,
        description: "Maximum surface area (m2)",
      },
      dormitorios: {
        type: "number",
        nullable: true,
        description: "Number of bedrooms",
      },
      banios: {
        type: "number",
        nullable: true,
        description: "Number of bathrooms",
      },
      updatedAt: {
        type: "string",
        format: "date-time",
        description: "Last update timestamp",
      },
    },
    required: [
      "id",
      "slug",
      "nombre",
      "tipo",
      "operacion",
      "isla",
      "municipio",
      "mapPrivacyMode",
      "locationApprox",
      "precioMin",
      "precioMax",
      "superficieMin",
      "superficieMax",
      "dormitorios",
      "banios",
      "updatedAt",
    ],
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

  registry.registerComponent("schemas", "LeadInstitutionalInput", {
    type: "object",
    description: "Institutional lead creation payload",
    properties: {
      name: { type: "string", minLength: 1, description: "Contact name" },
      email: {
        type: "string",
        format: "email",
        description: "Contact email",
      },
      phone: {
        type: "string",
        description: "Contact phone (optional)",
      },
      message: {
        type: "string",
        description: "Message (optional)",
      },
      promocionId: {
        type: "string",
        format: "uuid",
        description: "Promocion UUID",
      },
      tipologiaId: {
        type: "string",
        format: "uuid",
        description: "Tipologia UUID (optional)",
      },
      consent: {
        type: "object",
        description: "RGPD consent record",
        properties: {
          legalBasis: {
            type: "string",
            minLength: 1,
            description: "Legal basis for processing",
          },
          textAccepted: {
            type: "string",
            minLength: 1,
            description: "Accepted privacy policy text",
          },
        },
        required: ["legalBasis", "textAccepted"],
      },
    },
    required: ["name", "email", "promocionId", "consent"],
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

  registry.registerComponent("schemas", "ErrorResponse", {
    type: "object",
    description: "Generic error response",
    properties: {
      error: { type: "string", description: "Error message" },
    },
    required: ["error"],
  });

  registry.registerComponent("schemas", "RateLimitErrorResponse", {
    type: "object",
    description: "Rate limit exceeded response",
    properties: {
      error: { type: "string", description: "Error message" },
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
      error: { type: "string", description: "Error message" },
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
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      "403": {
        description: "Invalid or revoked API key",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
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
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      "401": {
        description: "Missing API key",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      "403": {
        description: "Invalid or revoked API key",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
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
