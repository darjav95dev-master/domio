// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../src/infrastructure/db/schema";
import { runSeed } from "../../scripts/seed";
import {
  createTestPool,
  hasDatabaseUrl,
  resetTenantData,
  withTenant,
} from "../isolation/db";
import type { Pool } from "pg";

const TENANT_SLUG = "domio";
const TENANT_SEED_UUID = "00000000-0000-0000-0000-000000000001";

let pool: Pool;

/** Helper: count rows in a table within the tenant context. */
async function countRows(
  client: Awaited<ReturnType<Pool["connect"]>>,
  table: string,
): Promise<number> {
  const result = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${table}`,
  );
  return parseInt(result.rows[0].count, 10);
}

beforeAll(async () => {
  if (!hasDatabaseUrl()) return;

  pool = createTestPool();
  await pool.query("SELECT 1");
  await resetTenantData(pool);

  // Seed the domain tenant with the deterministic UUID
  await pool.query(
    `INSERT INTO tenants (id, slug, name, config)
     VALUES ($1, $2, 'Domio Inmobiliaria', '{}')
     ON CONFLICT (id) DO NOTHING`,
    [TENANT_SEED_UUID, TENANT_SLUG],
  );
});

afterAll(async () => {
  if (pool) {
    await pool.query("TRUNCATE tenants RESTART IDENTITY CASCADE");
    await pool.end();
  }
});

describe("seed integration", () => {
  it(
    "CA-4: seed executes without errors",
    { timeout: 30_000 },
    async () => {
      if (!hasDatabaseUrl()) return;

      const db = drizzle(pool, { schema });
      await expect(runSeed(db)).resolves.toBeUndefined();
    },
  );

  it(
    "CA-5: inserts at least 8 promociones, 5 leads, 1 tenant, 5 usuarios, contact config",
    { timeout: 10_000 },
    async () => {
      if (!hasDatabaseUrl()) return;

      await withTenant(pool, TENANT_SEED_UUID, async (client) => {
        expect(await countRows(client, "promociones")).toBeGreaterThanOrEqual(8);
        expect(await countRows(client, "leads")).toBeGreaterThanOrEqual(5);
        expect(await countRows(client, "users")).toBeGreaterThanOrEqual(5);
        expect(await countRows(client, "contact_config")).toBeGreaterThanOrEqual(1);
        expect(await countRows(client, "content_blocks")).toBeGreaterThanOrEqual(4);
      });

      // Tenant count (no RLS on tenants)
      const tenantResult = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM tenants WHERE slug = $1",
        [TENANT_SLUG],
      );
      expect(parseInt(tenantResult.rows[0].count, 10)).toBeGreaterThanOrEqual(1);
    },
  );

  it(
    "CA-6: every domain record carries the default tenant_id",
    { timeout: 10_000 },
    async () => {
      if (!hasDatabaseUrl()) return;

      const tables = [
        "users",
        "promociones",
        "tipologias",
        "unidades",
        "promocion_content_blocks",
        "media_assets",
        "leads",
        "consent_records",
        "contact_config",
        "content_blocks",
      ];

      // First, get the actual tenant ID from the seed
      const tenantResult = await pool.query<{ id: string }>(
        "SELECT id::text as id FROM tenants WHERE slug = $1 LIMIT 1",
        [TENANT_SLUG],
      );
      const actualTenantId = tenantResult.rows[0]?.id;
      if (!actualTenantId) {
        throw new Error("Tenant 'domio' not found — run seed first");
      }

      // Use withTenant to set RLS context for querying tenant-isolated tables
      await withTenant(pool, actualTenantId, async (client) => {
        for (const table of tables) {
          const nullResult = await client.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM ${table} WHERE tenant_id IS NULL`,
          );
          expect(
            parseInt(nullResult.rows[0].count, 10),
            `Table ${table} has records with NULL tenant_id`,
          ).toBe(0);

          // All records should belong to the seed tenant (already guaranteed by RLS)
          const totalResult = await client.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM ${table}`,
          );
          expect(
            parseInt(totalResult.rows[0].count, 10),
            `Table ${table} should have records`,
          ).toBeGreaterThan(0);
        }
      });
    },
  );

  it(
    "CA-7: running seed twice does not duplicate data",
    { timeout: 30_000 },
    async () => {
      if (!hasDatabaseUrl()) return;

      // Record counts after first run
      const countsAfterFirst = await withTenant(pool, TENANT_SEED_UUID, async (client) => ({
        promociones: await countRows(client, "promociones"),
        leads: await countRows(client, "leads"),
        users: await countRows(client, "users"),
      }));

      // Run seed a second time
      const db = drizzle(pool, { schema });
      await runSeed(db);

      // Verify counts are unchanged
      await withTenant(pool, TENANT_SEED_UUID, async (client) => {
        expect(await countRows(client, "promociones")).toBe(
          countsAfterFirst.promociones,
        );
        expect(await countRows(client, "leads")).toBe(countsAfterFirst.leads);
        expect(await countRows(client, "users")).toBe(countsAfterFirst.users);
      });
    },
  );
});
