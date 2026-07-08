"use server";

import { ApiKeyRepository } from "@/infrastructure/db/repositories/api-key.repository";
import { createApiKeySchema, apiKeyFiltersSchema } from "@/shared/types/api-key-schema";
import { requireAdmin, type ActionResult } from "@/infrastructure/auth/require-admin";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type {
  ApiKeyResponse,
  CreateApiKeyResult,
  PaginatedApiKeys,
  ApiKeyFilters,
} from "@/shared/types/api-key-schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRepo(ctx: AuthenticatedContext): ApiKeyRepository {
  return new ApiKeyRepository(ctx);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * getApiKeysAction — list API keys with optional isActive filter.
 * Only ADMIN can call this.
 */
export async function getApiKeysAction(
  filters: ApiKeyFilters,
): Promise<ActionResult<PaginatedApiKeys>> {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.result;

  const parsed = apiKeyFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const repo = getRepo(auth.ctx);
  const result = await repo.findAll({
    isActive: parsed.data.isActive,
  });

  return {
    success: true,
    data: {
      items: result.items.map(mapApiKeyRow),
      total: result.total,
    },
  };
}

/**
 * createApiKeyAction — create a new API key and return the plain key once.
 * Only ADMIN can call this.
 */
export async function createApiKeyAction(
  name: string,
  rateLimitPerMin?: number,
): Promise<ActionResult<CreateApiKeyResult>> {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.result;

  const parsed = createApiKeySchema.safeParse({ name, rateLimitPerMin });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const repo = getRepo(auth.ctx);
  const result = await repo.create(parsed.data.name, parsed.data.rateLimitPerMin);

  return {
    success: true,
    data: {
      id: result.id,
      tenantId: result.tenantId,
      name: result.name,
      isActive: result.isActive,
      rateLimitPerMin: result.rateLimitPerMin,
      createdBy: result.createdBy,
      createdAt: result.createdAt,
      lastUsedAt: result.lastUsedAt,
      plainKey: result.plainKey,
    },
  };
}

/**
 * revokeApiKeyAction — revoke an API key (isActive = false).
 * Only ADMIN can call this.
 */
export async function revokeApiKeyAction(
  id: string,
): Promise<ActionResult<ApiKeyResponse>> {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.result;

  const repo = getRepo(auth.ctx);
  const result = await repo.revoke(id);

  return { success: true, data: mapApiKeyRow(result) };
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapApiKeyRow(row: {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  rateLimitPerMin: number;
  createdBy: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}): ApiKeyResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    isActive: row.isActive,
    rateLimitPerMin: row.rateLimitPerMin,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
  };
}
