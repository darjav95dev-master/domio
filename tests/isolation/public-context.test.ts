import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { promociones } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import { createTestPool, hasDatabaseUrl, withTenant } from "./db";
import type { Pool } from "pg";

const publicTenantId = "22222222-2222-2222-2222-222222222222";

class TestPromocionRepository extends TenantAwareRepository {
  async findPublished() {
    return this.ctx.withTransaction(async (tx) => {
      const filters = this.ctx.resolveFilters?.() ?? {};
      const statusFilter = filters.status;

      if (typeof statusFilter !== "string") {
        throw new Error("Missing status filter from PublicContext");
      }

      return tx.select().from(promociones).where(eq(promociones.status, statusFilter));
    });
  }
}

describe.skipIf(!hasDatabaseUrl())("PublicContext integration", () => {
  let pool: Pool;
  const seededSlugs: string[] = [];

  beforeAll(async () => {
    pool = createTestPool();
    await pool.query("SELECT 1");

    await pool.query(
      `INSERT INTO tenants (id, slug, name) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [publicTenantId, "public-tenant", "Public Tenant"],
    );
  });

  afterEach(async () => {
    if (seededSlugs.length === 0) {
      return;
    }

    await withTenant(pool, publicTenantId, async (client) => {
      const placeholders = seededSlugs.map((_, index) => `$${index + 1}`).join(", ");
      await client.query(
        `DELETE FROM promociones WHERE slug IN (${placeholders})`,
        seededSlugs,
      );
    });

    seededSlugs.length = 0;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("returns only PUBLISHED promociones for the public tenant", async () => {
    vi.resetModules();
    process.env.PUBLIC_TENANT_ID = publicTenantId;

    const slugSuffix = Date.now().toString();
    const publishedSlug = `published-${slugSuffix}`;
    const draftSlug = `draft-${slugSuffix}`;
    seededSlugs.push(publishedSlug, draftSlug);

    await withTenant(pool, publicTenantId, async (client) => {
      await client.query(
        `INSERT INTO promociones (
          tenant_id, slug, name, kind, status, location, location_approx, map_privacy_mode
        ) VALUES
          ($1, $2, $3, 'portfolio', 'PUBLISHED', 'POINT(0 0)', 'POINT(0 0)', 'EXACT'),
          ($1, $4, $5, 'portfolio', 'DRAFT', 'POINT(0 0)', 'POINT(0 0)', 'EXACT')`,
        [
          publicTenantId,
          publishedSlug,
          "Published Promo",
          draftSlug,
          "Draft Promo",
        ],
      );
    });

    const { PublicContext } = await import("@/infrastructure/tenant/PublicContext");
    const ctx = new PublicContext();
    const repo = new TestPromocionRepository(ctx);
    const rows = await repo.findPublished();

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("PUBLISHED");
    expect(rows[0].name).toBe("Published Promo");
  });
});
