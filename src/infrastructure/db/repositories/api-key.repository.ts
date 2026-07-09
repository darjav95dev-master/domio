import crypto from "node:crypto";
import { eq, and, count, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { apiKeys } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import {
  BCRYPT_SALT_ROUNDS,
  API_KEY_BYTE_LENGTH,
} from "@/shared/constants/domain-config";
import type { ApiKeyRow } from "@/shared/types/api-key-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiKeyFilters {
  isActive?: boolean;
}

import { PaginatedResult } from "@/shared/types/pagination";

export interface CreateApiKeyResult extends ApiKeyRow {
  plainKey: string;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class ApiKeyRepository extends TenantAwareRepository {
  private readonly authCtx: AuthenticatedContext;

  constructor(ctx: AuthenticatedContext) {
    super(ctx);
    this.authCtx = ctx;
  }

  /**
   * Returns all API keys for the tenant, optionally filtered by isActive.
   */
  async findAll(filters: ApiKeyFilters): Promise<PaginatedResult<ApiKeyRow>> {
    return this.withTransaction(async (tx) => {
      const conditions: ReturnType<typeof eq>[] = [
        eq(apiKeys.tenantId, this.authCtx.getTenantId()),
      ];

      if (filters.isActive !== undefined) {
        conditions.push(eq(apiKeys.isActive, filters.isActive));
      }

      const whereClause = and(...conditions);

      const items = await tx
        .select()
        .from(apiKeys)
        .where(whereClause)
        .orderBy(desc(apiKeys.createdAt));

      const totalResult = await tx
        .select({ count: count() })
        .from(apiKeys)
        .where(whereClause);

      const total = Number(totalResult[0]?.count ?? 0);

      return { items, total };
    });
  }

  /**
   * Returns a single API key by id, or null if not found within the tenant.
   */
  async findById(id: string): Promise<ApiKeyRow | null> {
    return this.withTransaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.id, id),
            eq(apiKeys.tenantId, this.authCtx.getTenantId()),
          ),
        );

      return row ?? null;
    });
  }

  /**
   * Creates a new API key.
   *
   * 1. Generates a random key with `dom_` prefix for human readability.
   * 2. Hashes the key with bcrypt (salt rounds 12).
   * 3. Stores the hash in the database.
   * 4. Returns the row with the plain key (shown only once to the creator).
   *
   * @param name - Human-readable name for the key
   * @param rateLimitPerMin - Rate limit per minute (defaults to 60)
   */
  async create(
    name: string,
    rateLimitPerMin?: number,
  ): Promise<CreateApiKeyResult> {
    // Generate random key outside the transaction (pure computation)
    const plainKey = `dom_${crypto.randomBytes(API_KEY_BYTE_LENGTH).toString("hex")}`;
    const keyHash = await bcrypt.hash(plainKey, BCRYPT_SALT_ROUNDS);
    const keyPrefix = plainKey.slice(0, 8);

    return this.withTransaction(async (tx) => {
      const [row] = await tx
        .insert(apiKeys)
        .values({
          tenantId: this.authCtx.getTenantId(),
          name,
          keyHash,
          keyPrefix,
          rateLimitPerMin: rateLimitPerMin ?? 60,
          createdBy: this.authCtx.userId,
        })
        .returning();

      if (!row) {
        throw new Error("Failed to create API key");
      }

      return {
        ...row,
        plainKey,
      };
    });
  }

  /**
   * Revokes an API key by setting isActive = false.
   */
  async revoke(id: string): Promise<ApiKeyRow> {
    return this.withTransaction(async (tx) => {
      const [updated] = await tx
        .update(apiKeys)
        .set({ isActive: false })
        .where(
          and(
            eq(apiKeys.id, id),
            eq(apiKeys.tenantId, this.authCtx.getTenantId()),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error(`API key with id ${id} not found`);
      }

      return updated;
    });
  }

}
