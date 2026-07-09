import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { apiKeys } from "@/infrastructure/db/schema";
import { db } from "@/infrastructure/db/client";
import { ApiKeyContext } from "@/infrastructure/tenant/ApiKeyContext";
import { ContextResolutionError } from "@/infrastructure/tenant/context-middleware";
import { API_KEY_HEADER } from "@/shared/constants/tenant-hosts";
import { logger } from "@/shared/utils/logger";

/**
 * Internal record returned by the key lookup function.
 */
export interface MatchedApiKey {
  id: string;
  tenantId: string;
  rateLimitPerMin: number;
}

/**
 * Type for the key lookup dependency.
 * Default implementation queries the DB; tests can inject mocks.
 */
export type FindActiveKeysFn = () => Promise<
  Array<{ id: string; tenantId: string; keyHash: string; rateLimitPerMin: number }>
>;

/**
 * Type for the last-used-at updater dependency.
 */
export type TouchLastUsedAtFn = (apiKeyId: string) => Promise<void>;

// ─── Default implementations (production) ────────────────────────────────────

const defaultFindActiveKeys: FindActiveKeysFn = async () => {
  return db
    .select({
      id: apiKeys.id,
      tenantId: apiKeys.tenantId,
      keyHash: apiKeys.keyHash,
      rateLimitPerMin: apiKeys.rateLimitPerMin,
    })
    .from(apiKeys)
    .where(eq(apiKeys.isActive, true));
};

const defaultTouchLastUsedAt: TouchLastUsedAtFn = async (apiKeyId: string) => {
  try {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKeyId));
  } catch (error) {
    // Non-critical: log but do not fail the request
    logger.warn(
      `Failed to update last_used_at for API key ${apiKeyId}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
};

/**
 * Extract the API key from a request's headers.
 *
 * Checks, in order:
 * 1. `Authorization: Bearer <key>`
 * 2. `X-API-Key` header (defined in tenant-hosts.ts as `x-api-key`)
 *
 * Returns the key string, or null if absent.
 */
export function extractApiKeyFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const BEARER_PREFIX = "Bearer ";

  if (authHeader.startsWith(BEARER_PREFIX)) {
    const token = authHeader.slice(BEARER_PREFIX.length).trim();
    if (token.length > 0) {
      return token;
    }
  }

  return request.headers.get(API_KEY_HEADER);
}

/**
 * Locate a matching active API key from the DB by bcrypt-comparing the
 * provided plaintext key against all active key hashes.
 *
 * @param plaintextKey The key extracted from the request.
 * @param findActiveKeysFn Function that returns active keys (injectable for tests).
 * @returns The matched key record or null.
 */
export async function findMatchingApiKey(
  plaintextKey: string,
  findActiveKeysFn: FindActiveKeysFn = defaultFindActiveKeys,
): Promise<MatchedApiKey | null> {
  const activeKeys = await findActiveKeysFn();

  for (const key of activeKeys) {
    const matches = await bcrypt.compare(plaintextKey, key.keyHash);
    if (matches) {
      return {
        id: key.id,
        tenantId: key.tenantId,
        rateLimitPerMin: key.rateLimitPerMin,
      };
    }
  }

  return null;
}

/**
 * Validate an API key from an incoming request.
 *
 * 1. Extracts the key from headers (X-API-Key or Authorization: Bearer).
 * 2. Looks up active keys in the api_keys table and bcrypt-compares.
 * 3. If valid, updates last_used_at and returns an ApiKeyContext.
 *
 * @throws {ContextResolutionError} with status 401 if no key is present,
 *   or 403 if the key is invalid/revoked.
 */
export async function validateApiKey(
  request: Request,
  options?: {
    findActiveKeysFn?: FindActiveKeysFn;
    touchLastUsedAtFn?: TouchLastUsedAtFn;
  },
): Promise<ApiKeyContext> {
  const key = extractApiKeyFromRequest(request);

  if (!key) {
    throw new ContextResolutionError("Missing API key", 401);
  }

  const findFn = options?.findActiveKeysFn ?? defaultFindActiveKeys;
  const touchFn = options?.touchLastUsedAtFn ?? defaultTouchLastUsedAt;

  const matched = await findMatchingApiKey(key, findFn);

  if (!matched) {
    throw new ContextResolutionError("Invalid or revoked API key", 403);
  }

  // Fire-and-forget: update last_used_at (non-critical)
  void touchFn(matched.id);

  return new ApiKeyContext(matched.tenantId, matched.id);
}
