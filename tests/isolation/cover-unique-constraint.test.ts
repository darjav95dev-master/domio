import { describe, expect, it, beforeAll, afterAll } from "vitest";
import type { Pool } from "pg";
import {
  createTestPool,
  hasDatabaseUrl,
  resetTenantData,
  seedTenant,
  withTenant,
} from "./db";

describe.skipIf(!hasDatabaseUrl())("media_assets cover unique constraint", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createTestPool();
    await pool.query("SELECT 1");
    await resetTenantData(pool);
    await seedTenant(pool, "55555555-5555-5555-5555-555555555555", "cover-tenant", "Cover Tenant");
    await seedTenant(pool, "77777777-7777-7777-7777-777777777777", "cover-tenant-2", "Cover Tenant 2");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rejects two covers for the same owner", async () => {
    const tenantId = "55555555-5555-5555-5555-555555555555";
    const ownerId = "66666666-6666-6666-6666-666666666666";

    await withTenant(pool, tenantId, async (client) => {
      await client.query(
        `INSERT INTO media_assets (
          tenant_id, owner_type, owner_id, kind, r2_key, alt_text, is_cover
        ) VALUES ($1, 'PROMOCION', $2, 'IMAGE_GALLERY', 'key-1', 'Cover 1', true)`,
        [tenantId, ownerId],
      );
    });

    await expect(
      withTenant(pool, tenantId, async (client) => {
        await client.query(
          `INSERT INTO media_assets (
            tenant_id, owner_type, owner_id, kind, r2_key, alt_text, is_cover
          ) VALUES ($1, 'PROMOCION', $2, 'IMAGE_GALLERY', 'key-2', 'Cover 2', true)`,
          [tenantId, ownerId],
        );
      }),
    ).rejects.toThrow();
  });

  it("allows a non-cover asset and a cover asset for the same owner", async () => {
    const tenantId = "77777777-7777-7777-7777-777777777777";
    const ownerId = "88888888-8888-8888-8888-888888888888";

    await withTenant(pool, tenantId, async (client) => {
      // sort_order explícito: media_assets_gallery_sort_idx exige unicidad
      // de (tenant_id, owner_id, sort_order) dentro de IMAGE_GALLERY.
      await client.query(
        `INSERT INTO media_assets (
          tenant_id, owner_type, owner_id, kind, r2_key, alt_text, is_cover, sort_order
        ) VALUES ($1, 'PROMOCION', $2, 'IMAGE_GALLERY', 'key-3', 'Not cover', false, 0)`,
        [tenantId, ownerId],
      );

      await client.query(
        `INSERT INTO media_assets (
          tenant_id, owner_type, owner_id, kind, r2_key, alt_text, is_cover, sort_order
        ) VALUES ($1, 'PROMOCION', $2, 'IMAGE_GALLERY', 'key-4', 'Cover', true, 1)`,
        [tenantId, ownerId],
      );
    });

    const result = await withTenant(pool, tenantId, async (client) => {
      return client.query(
        "SELECT * FROM media_assets WHERE owner_id = $1",
        [ownerId],
      );
    });

    expect(result.rows).toHaveLength(2);
  });
});
