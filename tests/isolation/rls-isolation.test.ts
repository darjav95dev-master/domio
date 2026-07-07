import { describe, expect, it, beforeAll, afterAll } from "vitest";
import type { Pool } from "pg";
import {
  createTestPool,
  hasDatabaseUrl,
  resetTenantData,
  seedTenant,
  withTenant,
} from "./db";

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const TENANT_C = "33333333-3333-3333-3333-333333333333";
const TENANT_D = "44444444-4444-4444-4444-444444444444";

describe.skipIf(!hasDatabaseUrl())("RLS tenant isolation", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createTestPool();
    await pool.query("SELECT 1");
    await resetTenantData(pool);
    await seedTenant(pool, TENANT_A, "rls-tenant-a", "RLS Tenant A");
    await seedTenant(pool, TENANT_B, "rls-tenant-b", "RLS Tenant B");
    await seedTenant(pool, TENANT_C, "rls-tenant-c", "RLS Tenant C");
    await seedTenant(pool, TENANT_D, "rls-tenant-d", "RLS Tenant D");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("hides tenant A promociones from tenant B", async () => {
    await withTenant(pool, TENANT_A, async (client) => {
      await client.query(
        `INSERT INTO promociones (
          tenant_id, slug, name, kind, status, location, location_approx, map_privacy_mode
        ) VALUES ($1, $2, $3, 'portfolio', 'PUBLISHED', 'POINT(0 0)', 'POINT(0 0)', 'EXACT')`,
        [TENANT_A, "promo-a", "Promo A"],
      );
    });

    const tenantBRows = await withTenant(pool, TENANT_B, async (client) => {
      const result = await client.query("SELECT * FROM promociones");
      return result.rows;
    });

    expect(tenantBRows).toHaveLength(0);
  });

  it("returns tenant A promociones when queried from tenant A", async () => {
    const tenantARows = await withTenant(pool, TENANT_A, async (client) => {
      const result = await client.query("SELECT * FROM promociones");
      return result.rows;
    });

    expect(tenantARows.length).toBeGreaterThan(0);
  });

  it("applies isolation to users table", async () => {
    await withTenant(pool, TENANT_C, async (client) => {
      await client.query(
        `INSERT INTO users (tenant_id, email, role) VALUES ($1, $2, 'ADMIN')`,
        [TENANT_C, `admin-a-${Date.now()}@example.com`],
      );
    });

    const tenantBUsers = await withTenant(pool, TENANT_D, async (client) => {
      const result = await client.query("SELECT * FROM users");
      return result.rows;
    });

    expect(
      tenantBUsers.every((row) => row.tenant_id !== TENANT_C),
    ).toBe(true);
  });
});
