import { z } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  API_KEY_NAME_MAX_LENGTH,
} from "@/shared/constants/domain-config";

// ---------------------------------------------------------------------------
// API Key schemas
// ---------------------------------------------------------------------------

/**
 * Schema for creating a new API key.
 */
export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(
      API_KEY_NAME_MAX_LENGTH,
      `Nombre demasiado largo (máx ${API_KEY_NAME_MAX_LENGTH})`,
    ),
  rateLimitPerMin: z
    .number()
    .int()
    .positive("El rate limit debe ser positivo")
    .max(10000, "Rate limit demasiado alto")
    .default(60),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

/**
 * Filters for listing API keys.
 */
export const apiKeyFiltersSchema = z.object({
  isActive: z.boolean().optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE)
    .optional(),
});

export type ApiKeyFilters = z.infer<typeof apiKeyFiltersSchema>;

/**
 * Response type for an API key row (what the repository returns).
 * Note: keyHash is never exposed to the client. plainKey is only shown once on creation.
 */
export const apiKeyResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  isActive: z.boolean(),
  rateLimitPerMin: z.number().int(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.date(),
  lastUsedAt: z.date().nullable(),
});

export type ApiKeyResponse = z.infer<typeof apiKeyResponseSchema>;

/**
 * Result of creating an API key — includes the plain key shown once.
 */
export const createApiKeyResultSchema = apiKeyResponseSchema.extend({
  plainKey: z.string(),
});

export type CreateApiKeyResult = z.infer<typeof createApiKeyResultSchema>;

/**
 * Paginated response.
 */
export const paginatedApiKeysSchema = z.object({
  items: z.array(apiKeyResponseSchema),
  total: z.number().int().nonnegative(),
});

export type PaginatedApiKeys = z.infer<typeof paginatedApiKeysSchema>;

// Convenience type for the repository interface
export type ApiKeyRow = {
  id: string;
  tenantId: string;
  keyHash: string;
  name: string;
  isActive: boolean;
  rateLimitPerMin: number;
  createdBy: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
};
