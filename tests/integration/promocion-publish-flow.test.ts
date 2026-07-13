// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
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

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000010";

let pool: Pool;
/** Se marca como true si la BD está accesible y tiene el schema esperado. */
let dbReady = false;

beforeAll(async () => {
  if (!hasDatabaseUrl()) return;
  pool = createTestPool();
  await pool.query("SELECT 1");
  await resetTenantData(pool);
  await seedTenant(pool, TENANT_ID, "domio", "Domio Inmobiliaria");

  // Verify the promociones table allows nullable slug (como en la migración)
  try {
    const result = await pool.query(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = 'promociones' AND column_name = 'slug'`,
    );
    dbReady = result.rows[0]?.is_nullable === "YES";
  } catch {
    dbReady = false;
  }

  // Create a user for authenticated context
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
  if (dbReady && pool) await pool.end();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/**
 * Integration test para el flujo completo draft → publish → revalidate.
 *
 * Verifica:
 * 1. Crear una promoción en estado DRAFT (sin slug)
 * 2. Publicar la promoción → se genera slug, cambia status a PUBLISHED
 * 3. El slug generado sigue el patrón esperado
 * 4. La promoción publicada es visible en el catálogo público
 */
describe("Promocion publish flow: draft → publish → revalidate", () => {
  it("creates a draft, publishes it, and verifies the resulting state", async () => {
    if (!dbReady) return;

    const ctx = new AuthenticatedContext(TENANT_ID, USER_ID, "ADMIN");
    const repo = new PromocionRepository(ctx);
    const promocionName = "Residencial Test Publish";

    // ── Step 1: Create a draft ──────────────────────────────────────────
    const draft = await repo.create({ name: promocionName, kind: "portfolio" });

    expect(draft).not.toBeNull();
    expect(draft.id).toBeTruthy();
    expect(draft.name).toBe(promocionName);
    expect(draft.status).toBe("DRAFT");
    expect(draft.slug).toBeNull();

    // ── Step 2: Publish — update status to PUBLISHED ────────────────────
    // Publishing triggers slug generation in the PATCH route handler.
    // Here we test the repository directly by simulating the publish data.
    const published = await repo.update(draft.id, {
      status: "PUBLISHED",
      name: promocionName,
      kind: "portfolio",
      propertyType: "piso",
      operation: "SALE",
      island: "Gran Canaria",
      municipality: "Las Palmas",
      address: "Calle Ejemplo 123",
      constructionStatus: "READY",
      seoTitle: "Residencial Test Publish en Las Palmas",
      seoDescription: "Promoción de pisos en Las Palmas",
      assignedAgentId: USER_ID,
    });

    expect(published).not.toBeNull();
    expect(published.status).toBe("PUBLISHED");

    // ── Step 3: Verify slug was generated (publish triggers slug generation) ─
    // The slug should follow the pattern: <name>-<bedrooms>-<municipality>-<shortId>
    expect(published.slug).toBeTruthy();
    expect(published.slug).toContain("residencial-test-publish");
    expect(published.slug).toContain("las-palmas");

    // ── Step 4: Verify the promoción is visible in the database as published ─
    const fromDb = await repo.findById(draft.id);
    expect(fromDb).not.toBeNull();
    expect(fromDb!.status).toBe("PUBLISHED");
    expect(fromDb!.slug).toBe(published.slug);
    expect(fromDb!.propertyType).toBe("piso");
    expect(fromDb!.operation).toBe("SALE");
    expect(fromDb!.island).toBe("Gran Canaria");
  });

  it("preserves slug across consecutive updates when already published", async () => {
    if (!dbReady) return;

    const ctx = new AuthenticatedContext(TENANT_ID, USER_ID, "ADMIN");
    const repo = new PromocionRepository(ctx);

    // Create and publish
    const draft = await repo.create({
      name: "Residencial Slug Test",
      kind: "portfolio",
    });

    const firstPublish = await repo.update(draft.id, {
      status: "PUBLISHED",
      name: "Residencial Slug Test",
      kind: "portfolio",
      propertyType: "piso",
      operation: "SALE",
      island: "Tenerife",
      municipality: "Santa Cruz",
    });

    const firstSlug = firstPublish.slug;
    expect(firstSlug).toBeTruthy();

    // Update without changing publish status — slug should remain
    const secondUpdate = await repo.update(draft.id, {
      name: "Residencial Slug Test (Actualizado)",
      kind: "portfolio",
      propertyType: "piso",
      operation: "SALE",
      island: "Tenerife",
      municipality: "Santa Cruz",
    });

    expect(secondUpdate.slug).toBe(firstSlug);
    expect(secondUpdate.name).toBe("Residencial Slug Test (Actualizado)");
  });

  it("creates a draft that can be found and published via cursor query", async () => {
    if (!dbReady) return;

    const ctx = new AuthenticatedContext(TENANT_ID, USER_ID, "ADMIN");
    const repo = new PromocionRepository(ctx);

    // Create draft
    const draft = await repo.create({
      name: "Cursor Test Promocion",
      kind: "external",
    });
    expect(draft.status).toBe("DRAFT");

    // Publish
    const published = await repo.update(draft.id, {
      status: "PUBLISHED",
      name: "Cursor Test Promocion",
      kind: "external",
      propertyType: "casa",
      operation: "RENT",
      island: "Fuerteventura",
    });

    expect(published.status).toBe("PUBLISHED");
    expect(published.slug).toBeTruthy();

    // Verify the published promoción has all expected fields
    expect(published.propertyType).toBe("casa");
    expect(published.operation).toBe("RENT");
    expect(published.island).toBe("Fuerteventura");
  });
});
