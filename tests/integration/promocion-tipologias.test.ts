/* eslint-disable sonarjs/no-duplicate-string */

// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import type { Pool } from "pg";
import {
  createTestPool,
  hasDatabaseUrl,
  resetTenantData,
  seedTenant,
  withTenant,
} from "../isolation/db";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import { db } from "@/infrastructure/db/client";
import { promociones } from "@/infrastructure/db/schema";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000010";

let pool: Pool;

beforeAll(async () => {
  if (!hasDatabaseUrl()) return;
  pool = createTestPool();
  await pool.query("SELECT 1");
  await resetTenantData(pool);
  await seedTenant(pool, TENANT_ID, "domio", "Domio Inmobiliaria");

  // Create a user for history recording (within tenant context due to RLS)
  await withTenant(pool, TENANT_ID, async (client) => {
    await client.query(
      `INSERT INTO users (id, tenant_id, name, email, role)
       VALUES ($1, $2, 'Test Admin', 'admin@test.com', 'ADMIN')
       ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_ID],
    );
  });
});

afterAll(async () => {
  if (pool) {
    await pool.query("TRUNCATE tenants RESTART IDENTITY CASCADE");
    await pool.end();
  }
});

describe("PromocionRepository syncTipologias", () => {
  let ctx: AuthenticatedContext;
  let repo: PromocionRepository;
  let promocionId: string;

  beforeAll(async () => {
    if (!hasDatabaseUrl()) return;
    ctx = new AuthenticatedContext(TENANT_ID, USER_ID, "ADMIN");
    repo = new PromocionRepository(ctx);

    // Create a promoción to work with
    promocionId = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.current_tenant_id', ${TENANT_ID}, true)`,
      );
      const [row] = await tx
        .insert(promociones)
        .values({
          tenantId: TENANT_ID,
          slug: "",
          name: "Test Sync Promo",
          kind: "external",
          status: "DRAFT",
          location: [0, 0],
          locationApprox: [0, 0],
          mapPrivacyMode: "EXACT",
        })
        .returning();
      return row!.id;
    });
  });

    /** Clean tipologías and unidades between tests. */
  beforeEach(async () => {
    if (!hasDatabaseUrl()) return;
    // Clean all tipologías for this promoción (cascades to unidades)
    await withTenant(pool, TENANT_ID, async (client) => {
      await client.query(
        "DELETE FROM tipologias WHERE promocion_id = $1",
        [promocionId],
      );
    });
  });

  it("creates new tipologías and unidades when payload has items without id", async () => {
    if (!hasDatabaseUrl()) return;

    await repo.update(promocionId, {
      tipologias: [
        {
          name: "Tipología A",
          bedrooms: 3,
          bathrooms: 2,
          usefulArea: 80,
          builtArea: 95,
          referencePriceSale: 250000,
          amenities: ["piscina", "garaje"],
          unidades: [
            { status: "AVAILABLE", identifier: "1A" },
            { status: "AVAILABLE", identifier: "1B" },
          ],
        },
        {
          name: "Tipología B",
          bedrooms: 2,
          bathrooms: 1,
          referencePriceRent: 1200,
          unidades: [],
        },
      ],
    });

    const result = await repo.findById(promocionId);
    expect(result).not.toBeNull();
    expect(result!.tipologias).toHaveLength(2);

    const tipologiaA = result!.tipologias.find((t) => t.name === "Tipología A");
    expect(tipologiaA).toBeDefined();
    expect(tipologiaA!.bedrooms).toBe(3);
    expect(tipologiaA!.amenities).toEqual(["piscina", "garaje"]);
    expect(tipologiaA!.unidades).toHaveLength(2);

    const tipologiaB = result!.tipologias.find((t) => t.name === "Tipología B");
    expect(tipologiaB).toBeDefined();
    expect(tipologiaB!.unidades).toHaveLength(0);
  });

  it("updates existing tipologías when payload has items with id", async () => {
    if (!hasDatabaseUrl()) return;

    // First, seed 2 tipologías with unidades via raw insert
    await withTenant(pool, TENANT_ID, async (client) => {
      await client.query(`
        INSERT INTO tipologias (id, tenant_id, promocion_id, name, bedrooms, bathrooms)
        VALUES
          ('a0000000-0000-0000-0000-000000000001', $1, $2, 'Tipología A', 3, 2),
          ('a0000000-0000-0000-0000-000000000002', $1, $2, 'Tipología B', 2, 1)
      `, [TENANT_ID, promocionId]);

      await client.query(`
        INSERT INTO unidades (id, tenant_id, tipologia_id, identifier, status)
        VALUES
          ('b0000000-0000-0000-0000-000000000001', $1, 'a0000000-0000-0000-0000-000000000001', '1A', 'AVAILABLE'),
          ('b0000000-0000-0000-0000-000000000002', $1, 'a0000000-0000-0000-0000-000000000001', '1B', 'AVAILABLE'),
          ('b0000000-0000-0000-0000-000000000003', $1, 'a0000000-0000-0000-0000-000000000002', '2A', 'AVAILABLE')
      `, [TENANT_ID]);
    });

    // Update: rename A, change price, reserve one unidad, add a new unidad
    await repo.update(promocionId, {
      tipologias: [
        {
          id: "a0000000-0000-0000-0000-000000000001",
          name: "Tipología A (Updated)",
          bedrooms: 3,
          bathrooms: 2,
          referencePriceSale: 260000,
          amenities: ["piscina", "garaje", "trastero"],
          unidades: [
            { id: "b0000000-0000-0000-0000-000000000001", status: "RESERVED", identifier: "1A" },
            { status: "AVAILABLE", identifier: "1C" },
          ],
        },
        {
          id: "a0000000-0000-0000-0000-000000000002",
          name: "Tipología B",
          bedrooms: 2,
          bathrooms: 1,
          referencePriceRent: 1200,
          unidades: [{ status: "AVAILABLE", identifier: "2A" }],
        },
      ],
    });

    const result = await repo.findById(promocionId);
    expect(result).not.toBeNull();
    expect(result!.tipologias).toHaveLength(2);

    const updatedA = result!.tipologias.find(
      (t) => t.id === "a0000000-0000-0000-0000-000000000001",
    );
    expect(updatedA).toBeDefined();
    expect(updatedA!.name).toBe("Tipología A (Updated)");
    expect(updatedA!.referencePriceSale).toBe(260000);
    expect(updatedA!.amenities).toEqual(["piscina", "garaje", "trastero"]);
    expect(updatedA!.unidades).toHaveLength(2);
    const reserved = updatedA!.unidades.find((u) => u.status === "RESERVED");
    expect(reserved).toBeDefined();
    expect(reserved!.identifier).toBe("1A");
    const newUnidad = updatedA!.unidades.find((u) => u.identifier === "1C");
    expect(newUnidad).toBeDefined();
    expect(newUnidad!.status).toBe("AVAILABLE");

    const updatedB = result!.tipologias.find(
      (t) => t.id === "a0000000-0000-0000-0000-000000000002",
    );
    expect(updatedB).toBeDefined();
    // 2A was seeded, 2A is re-sent → survives
    expect(updatedB!.unidades).toHaveLength(1);
    expect(updatedB!.unidades[0]!.identifier).toBe("2A");
  });

  it("deletes tipologías not present in the payload", async () => {
    if (!hasDatabaseUrl()) return;

    // Seed 2 tipologías
    await withTenant(pool, TENANT_ID, async (client) => {
      await client.query(`
        INSERT INTO tipologias (id, tenant_id, promocion_id, name, bedrooms, bathrooms)
        VALUES
          ('c0000000-0000-0000-0000-000000000001', $1, $2, 'Keep Me', 3, 2),
          ('c0000000-0000-0000-0000-000000000002', $1, $2, 'Delete Me', 2, 1)
      `, [TENANT_ID, promocionId]);
    });

    // Send only the first tipología → second should be deleted
    await repo.update(promocionId, {
      tipologias: [
        {
          id: "c0000000-0000-0000-0000-000000000001",
          name: "Keep Me",
          bedrooms: 3,
          bathrooms: 2,
          unidades: [],
        },
      ],
    });

    const result = await repo.findById(promocionId);
    expect(result).not.toBeNull();
    expect(result!.tipologias).toHaveLength(1);
    expect(result!.tipologias[0]!.id).toBe(
      "c0000000-0000-0000-0000-000000000001",
    );
  });

  it("does nothing when tipologías is undefined", async () => {
    if (!hasDatabaseUrl()) return;

    // Seed one tipología first
    await withTenant(pool, TENANT_ID, async (client) => {
      await client.query(`
        INSERT INTO tipologias (id, tenant_id, promocion_id, name, bedrooms)
        VALUES ('d0000000-0000-0000-0000-000000000001', $1, $2, 'Untouched', 3)
      `, [TENANT_ID, promocionId]);
    });

    // Update promoción without tipologías
    await repo.update(promocionId, { name: "Renamed Promo" });

    const result = await repo.findById(promocionId);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Renamed Promo");
    expect(result!.tipologias).toHaveLength(1);
    expect(result!.tipologias[0]!.name).toBe("Untouched");
  });

  it("deletes unidades not present in the payload within an existing tipología", async () => {
    if (!hasDatabaseUrl()) return;

    // Seed one tipología with 2 unidades
    await withTenant(pool, TENANT_ID, async (client) => {
      await client.query(`
        INSERT INTO tipologias (id, tenant_id, promocion_id, name, bedrooms)
        VALUES ('e0000000-0000-0000-0000-000000000001', $1, $2, 'With Units', 3)
      `, [TENANT_ID, promocionId]);

      await client.query(`
        INSERT INTO unidades (id, tenant_id, tipologia_id, identifier, status)
        VALUES
          ('f0000000-0000-0000-0000-000000000001', $1, 'e0000000-0000-0000-0000-000000000001', 'U1', 'AVAILABLE'),
          ('f0000000-0000-0000-0000-000000000002', $1, 'e0000000-0000-0000-0000-000000000001', 'U2', 'AVAILABLE')
      `, [TENANT_ID]);
    });

    // Send only the first unidad → second should be deleted
    await repo.update(promocionId, {
      tipologias: [
        {
          id: "e0000000-0000-0000-0000-000000000001",
          name: "With Units",
          bedrooms: 3,
          bathrooms: 0,
          unidades: [
            {
              id: "f0000000-0000-0000-0000-000000000001",
              status: "AVAILABLE",
              identifier: "U1",
            },
          ],
        },
      ],
    });

    const after = await repo.findById(promocionId);
    expect(after).not.toBeNull();
    expect(after!.tipologias).toHaveLength(1);
    expect(after!.tipologias[0]!.unidades).toHaveLength(1);
    expect(after!.tipologias[0]!.unidades[0]!.id).toBe(
      "f0000000-0000-0000-0000-000000000001",
    );
  });
});
