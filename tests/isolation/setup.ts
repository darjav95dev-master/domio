import { createTestPool, resetTenantData, withTenant } from "./db";
import type { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import type { Pool } from "pg";

export const TENANT_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const TENANT_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
export const USER_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
export const USER_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";

let pool: Pool | null = null;

export function getTestPool(): Pool {
  if (!pool) {
    pool = createTestPool();
  }

  return pool;
}

async function getPromocionIdBySlug(
  testPool: Pool,
  tenantId: string,
  slug: string,
): Promise<string> {
  return withTenant(testPool, tenantId, async (client) => {
    const result = await client.query<{ id: string }>(
      "SELECT id FROM promociones WHERE slug = $1",
      [slug],
    );

    if (result.rows.length === 0) {
      throw new Error(`Promocion not found for slug: ${slug}`);
    }

    return result.rows[0].id;
  });
}

export async function seedTenantFixtures(): Promise<void> {
  const testPool = getTestPool();
  await testPool.query("SELECT 1");
  await resetTenantData(testPool);

  await testPool.query(
    `INSERT INTO tenants (id, slug, name) VALUES
       ($1, 'tenant-a', 'Tenant A'),
       ($2, 'tenant-b', 'Tenant B')
     ON CONFLICT (id) DO NOTHING`,
    [TENANT_A_ID, TENANT_B_ID],
  );

  await withTenant(testPool, TENANT_A_ID, async (client) => {
    await client.query(
      `INSERT INTO promociones (
         tenant_id, slug, name, kind, status, operation, property_type,
         location, location_approx, map_privacy_mode
       ) VALUES
         ($1, 'promo-a-1', 'Promocion A1', 'portfolio', 'PUBLISHED', 'SALE', 'piso',
          'POINT(0 0)', 'POINT(0 0)', 'EXACT'),
         ($1, 'promo-a-2', 'Promocion A2', 'external', 'DRAFT', 'RENT', 'ático',
          'POINT(0 0)', 'POINT(0 0)', 'EXACT')`,
      [TENANT_A_ID],
    );
  });

  await withTenant(testPool, TENANT_B_ID, async (client) => {
    await client.query(
      `INSERT INTO promociones (
         tenant_id, slug, name, kind, status, operation, property_type,
         location, location_approx, map_privacy_mode
       ) VALUES
         ($1, 'promo-b-1', 'Promocion B1', 'portfolio', 'PUBLISHED', 'SALE', 'casa',
          'POINT(0 0)', 'POINT(0 0)', 'EXACT'),
         ($1, 'promo-b-2', 'Promocion B2', 'portfolio', 'DRAFT', 'SALE', 'chalet',
          'POINT(0 0)', 'POINT(0 0)', 'EXACT')`,
      [TENANT_B_ID],
    );
  });

  const promoA1Id = await getPromocionIdBySlug(testPool, TENANT_A_ID, "promo-a-1");
  const promoB1Id = await getPromocionIdBySlug(testPool, TENANT_B_ID, "promo-b-1");

  await withTenant(testPool, TENANT_A_ID, async (client) => {
    await client.query(
      `INSERT INTO tipologias (
         tenant_id, promocion_id, name, useful_area, built_area, bedrooms, bathrooms
       ) VALUES ($1, $2, 'Tipologia A1', 80, 90, 2, 1)`,
      [TENANT_A_ID, promoA1Id],
    );

    await client.query(
      `INSERT INTO leads (
         tenant_id, promocion_id, source, channel, name, email, status
       ) VALUES ($1, $2, 'commercial', 'FORM', 'Lead A1', 'lead-a1@example.com', 'NEW')`,
      [TENANT_A_ID, promoA1Id],
    );
  });

  await withTenant(testPool, TENANT_B_ID, async (client) => {
    await client.query(
      `INSERT INTO tipologias (
         tenant_id, promocion_id, name, useful_area, built_area, bedrooms, bathrooms
       ) VALUES ($1, $2, 'Tipologia B1', 100, 110, 3, 2)`,
      [TENANT_B_ID, promoB1Id],
    );

    await client.query(
      `INSERT INTO leads (
         tenant_id, promocion_id, source, channel, name, email, status
       ) VALUES ($1, $2, 'commercial', 'FORM', 'Lead B1', 'lead-b1@example.com', 'NEW')`,
      [TENANT_B_ID, promoB1Id],
    );
  });
}

export async function cleanupFixtures(): Promise<void> {
  if (!pool) {
    return;
  }

  const tenantIds = [TENANT_A_ID, TENANT_B_ID];

  for (const tenantId of tenantIds) {
    await withTenant(pool, tenantId, async (client) => {
      await client.query("DELETE FROM leads");
      await client.query("DELETE FROM tipologias");
      await client.query("DELETE FROM promociones");
    });
  }

  await pool.query("DELETE FROM tenants WHERE id = ANY($1::uuid[])", [tenantIds]);
  await pool.end();
  pool = null;
}

export async function createTenantAContext(): Promise<AuthenticatedContext> {
  const { AuthenticatedContext: AuthenticatedContextClass } = await import(
    "@/infrastructure/tenant/AuthenticatedContext"
  );

  return new AuthenticatedContextClass(TENANT_A_ID, USER_A_ID, "ADMIN");
}

export async function createTenantBContext(): Promise<AuthenticatedContext> {
  const { AuthenticatedContext: AuthenticatedContextClass } = await import(
    "@/infrastructure/tenant/AuthenticatedContext"
  );

  return new AuthenticatedContextClass(TENANT_B_ID, USER_B_ID, "ADMIN");
}
