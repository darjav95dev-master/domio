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

  // Create a user for block operations
  await withTenant(pool, TENANT_ID, async (client) => {
    await client.query(
      `INSERT INTO users (id, tenant_id, name, email, role)
       VALUES ($1, $2, 'Test Admin', 'admin-blocks@test.com', 'ADMIN')
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

describe("PromocionRepository content blocks", () => {
  let ctx: AuthenticatedContext;
  let repo: PromocionRepository;
  let portfolioPromocionId: string;
  let externalPromocionId: string;

  // Shared payload constants for content block tests
  const ZONAS_COMUNES_PAYLOAD = JSON.stringify({
    items: [{ name: "Piscina", description: "Piscina comunitaria" }],
  });
  const PLAZOS_GARANTIAS_PAYLOAD = JSON.stringify({ delivery: "2026-12-01" });

  beforeAll(async () => {
    if (!hasDatabaseUrl()) return;
    ctx = new AuthenticatedContext(TENANT_ID, USER_ID, "ADMIN");
    repo = new PromocionRepository(ctx);

    // Create a portfolio promoción
    portfolioPromocionId = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.current_tenant_id', ${TENANT_ID}, true)`,
      );
      const [row] = await tx
        .insert(promociones)
        .values({
          tenantId: TENANT_ID,
          slug: "test-portfolio-promo",
          name: "Test Portfolio Promo",
          kind: "portfolio",
          status: "DRAFT",
          location: [0, 0],
          locationApprox: [0, 0],
          mapPrivacyMode: "EXACT",
        })
        .returning();
      return row!.id;
    });

    // Create an external promoción
    externalPromocionId = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.current_tenant_id', ${TENANT_ID}, true)`,
      );
      const [row] = await tx
        .insert(promociones)
        .values({
          tenantId: TENANT_ID,
          slug: "test-external-promo",
          name: "Test External Promo",
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

  /** Clean all content blocks between tests. */
  beforeEach(async () => {
    if (!hasDatabaseUrl()) return;
    await withTenant(pool, TENANT_ID, async (client) => {
      await client.query(
        "DELETE FROM promocion_content_blocks WHERE promocion_id = $1 OR promocion_id = $2",
        [portfolioPromocionId, externalPromocionId],
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findAllContentBlocks
  // ---------------------------------------------------------------------------

  describe("findAllContentBlocks", () => {
    it("returns empty array when no blocks exist", async () => {
      if (!hasDatabaseUrl()) return;

      const blocks = await repo.findAllContentBlocks(portfolioPromocionId);

      expect(blocks).toEqual([]);
    });

    it("returns blocks ordered by sort_order", async () => {
      if (!hasDatabaseUrl()) return;

      // Seed 3 blocks with specific sort_order values
      await withTenant(pool, TENANT_ID, async (client) => {
        for (let i = 0; i < 3; i++) {
          await client.query(
            `INSERT INTO promocion_content_blocks (tenant_id, promocion_id, block_type, payload, sort_order, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              TENANT_ID,
              portfolioPromocionId,
              "DESCRIPCION_GENERAL",
              JSON.stringify({ text: `Block ${i}` }),
              2 - i,
              USER_ID,
            ],
          );
        }
      });

      const blocks = await repo.findAllContentBlocks(portfolioPromocionId);

      expect(blocks).toHaveLength(3);
      expect(blocks[0]!.sortOrder).toBe(0);
      expect(blocks[1]!.sortOrder).toBe(1);
      expect(blocks[2]!.sortOrder).toBe(2);
    });

    it("does not return blocks from other tenants", async () => {
      if (!hasDatabaseUrl()) return;
      // This test relies on RLS isolation — if findAllContentBlocks uses
      // withTransaction with SET LOCAL, the RLS policy should filter out
      // any blocks inserted with a different tenant_id.

      // Insert a block with the correct tenant
      await withTenant(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO promocion_content_blocks (tenant_id, promocion_id, block_type, payload, sort_order, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            TENANT_ID,
            portfolioPromocionId,
            "DESCRIPCION_GENERAL",
            JSON.stringify({ text: "My block" }),
            0,
            USER_ID,
          ],
        );
      });

      // Try reading with a different tenant context
      const otherCtx = new AuthenticatedContext(
        "00000000-0000-0000-0000-000000000099",
        USER_ID,
        "ADMIN",
      );
      const otherRepo = new PromocionRepository(otherCtx);
      const blocks = await otherRepo.findAllContentBlocks(portfolioPromocionId);

      expect(blocks).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // upsertContentBlock
  // ---------------------------------------------------------------------------

  describe("upsertContentBlock", () => {
    it("creates a new content block", async () => {
      if (!hasDatabaseUrl()) return;

      const block = await repo.upsertContentBlock(
        portfolioPromocionId,
        "DESCRIPCION_GENERAL",
        { text: "Hello world" },
        USER_ID,
      );

      expect(block).toBeDefined();
      expect(block.blockType).toBe("DESCRIPCION_GENERAL");
      expect(block.sortOrder).toBe(0);
      expect(block.updatedBy).toBe(USER_ID);
    });

    it("updates an existing content block", async () => {
      if (!hasDatabaseUrl()) return;

      // First create a block
      const created = await repo.upsertContentBlock(
        portfolioPromocionId,
        "DESCRIPCION_GENERAL",
        { text: "Original text" },
        USER_ID,
      );

      // Then update it by passing the same block_type
      const updated = await repo.upsertContentBlock(
        portfolioPromocionId,
        "DESCRIPCION_GENERAL",
        { text: "Updated text" },
        USER_ID,
      );

      expect(updated.id).toBe(created.id);
      expect(updated.sortOrder).toBe(created.sortOrder);
      expect((updated.payload as { text: string }).text).toBe("Updated text");
    });

    it("rejects ZONAS_COMUNES for external promotions", async () => {
      if (!hasDatabaseUrl()) return;

      await expect(
        repo.upsertContentBlock(
          externalPromocionId,
          "ZONAS_COMUNES",
          JSON.parse(ZONAS_COMUNES_PAYLOAD) as Record<string, unknown>,
          USER_ID,
        ),
      ).rejects.toThrow(/not allowed for external|external promotions/);
    });

    it("rejects PLAZOS_GARANTIAS for external promotions", async () => {
      if (!hasDatabaseUrl()) return;

      await expect(
        repo.upsertContentBlock(
          externalPromocionId,
          "PLAZOS_GARANTIAS",
          JSON.parse(PLAZOS_GARANTIAS_PAYLOAD) as Record<string, unknown>,
          USER_ID,
        ),
      ).rejects.toThrow(/not allowed for external|external promotions/);
    });

    it("allows ZONAS_COMUNES for portfolio promotions", async () => {
      if (!hasDatabaseUrl()) return;

      const block = await repo.upsertContentBlock(
        portfolioPromocionId,
        "ZONAS_COMUNES",
        JSON.parse(ZONAS_COMUNES_PAYLOAD) as Record<string, unknown>,
        USER_ID,
      );

      expect(block).toBeDefined();
      expect(block.blockType).toBe("ZONAS_COMUNES");
    });

    it("assigns incremental sort_order when creating multiple blocks", async () => {
      if (!hasDatabaseUrl()) return;

      const block1 = await repo.upsertContentBlock(
        portfolioPromocionId,
        "DESCRIPCION_GENERAL",
        { text: "First" },
        USER_ID,
      );
      const block2 = await repo.upsertContentBlock(
        portfolioPromocionId,
        "MEMORIA_CALIDADES",
        { items: [{ title: "Calidad", description: "Buena" }] },
        USER_ID,
      );

      expect(block1.sortOrder).toBe(0);
      expect(block2.sortOrder).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Direct SQL trigger constraint (SC-005)
  // ---------------------------------------------------------------------------

  describe("SQL trigger check_block_kind_constraint", () => {
    const INSERT_BLOCK_SQL = `INSERT INTO promocion_content_blocks (tenant_id, promocion_id, block_type, payload, sort_order, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6)`;

    it("rejects INSERT of ZONAS_COMUNES for external promotions directly at DB level", async () => {
      if (!hasDatabaseUrl()) return;

      await expect(
        withTenant(pool, TENANT_ID, async (client) => {
          await client.query(
            INSERT_BLOCK_SQL,
            [
              TENANT_ID,
              externalPromocionId,
              "ZONAS_COMUNES",
              ZONAS_COMUNES_PAYLOAD,
              0,
              USER_ID,
            ],
          );
        }),
      ).rejects.toThrow(/not allowed for external/);
    });

    it("rejects INSERT of PLAZOS_GARANTIAS for external promotions directly at DB level", async () => {
      if (!hasDatabaseUrl()) return;

      await expect(
        withTenant(pool, TENANT_ID, async (client) => {
          await client.query(
            INSERT_BLOCK_SQL,
            [
              TENANT_ID,
              externalPromocionId,
              "PLAZOS_GARANTIAS",
              PLAZOS_GARANTIAS_PAYLOAD,
              0,
              USER_ID,
            ],
          );
        }),
      ).rejects.toThrow(/not allowed for external/);
    });

    it("allows INSERT of ZONAS_COMUNES for portfolio promotions at DB level", async () => {
      if (!hasDatabaseUrl()) return;

      await withTenant(pool, TENANT_ID, async (client) => {
        await client.query(
          INSERT_BLOCK_SQL,
          [
            TENANT_ID,
            portfolioPromocionId,
            "ZONAS_COMUNES",
            ZONAS_COMUNES_PAYLOAD,
            0,
            USER_ID,
          ],
        );

        const { rows } = await client.query(
          "SELECT id FROM promocion_content_blocks WHERE promocion_id = $1 AND block_type = $2",
          [portfolioPromocionId, "ZONAS_COMUNES"],
        );
        expect(rows).toHaveLength(1);
      });
    });

    it("allows INSERT of PLAZOS_GARANTIAS for portfolio promotions at DB level", async () => {
      if (!hasDatabaseUrl()) return;

      await withTenant(pool, TENANT_ID, async (client) => {
        await client.query(
          INSERT_BLOCK_SQL,
          [
            TENANT_ID,
            portfolioPromocionId,
            "PLAZOS_GARANTIAS",
            PLAZOS_GARANTIAS_PAYLOAD,
            0,
            USER_ID,
          ],
        );

        const { rows } = await client.query(
          "SELECT id FROM promocion_content_blocks WHERE promocion_id = $1 AND block_type = $2",
          [portfolioPromocionId, "PLAZOS_GARANTIAS"],
        );
        expect(rows).toHaveLength(1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // deleteContentBlock
  // ---------------------------------------------------------------------------

  describe("deleteContentBlock", () => {
    it("deletes a content block", async () => {
      if (!hasDatabaseUrl()) return;

      const block = await repo.upsertContentBlock(
        portfolioPromocionId,
        "DESCRIPCION_GENERAL",
        { text: "To be deleted" },
        USER_ID,
      );

      await repo.deleteContentBlock(portfolioPromocionId, block.id);

      const blocks = await repo.findAllContentBlocks(portfolioPromocionId);
      expect(blocks).toHaveLength(0);
    });

    it("reindexes sort_order after deletion", async () => {
      if (!hasDatabaseUrl()) return;

      const block1 = await repo.upsertContentBlock(
        portfolioPromocionId,
        "DESCRIPCION_GENERAL",
        { text: "First" },
        USER_ID,
      );
      const block2 = await repo.upsertContentBlock(
        portfolioPromocionId,
        "MEMORIA_CALIDADES",
        { items: [{ title: "Calidad", description: "Buena" }] },
        USER_ID,
      );
      const block3 = await repo.upsertContentBlock(
        portfolioPromocionId,
        "UBICACION_SERVICIOS",
        { items: [{ service: "Metro", distance: "200m" }] },
        USER_ID,
      );

      // Delete the middle block
      await repo.deleteContentBlock(portfolioPromocionId, block2.id);

      const remaining = await repo.findAllContentBlocks(portfolioPromocionId);
      expect(remaining).toHaveLength(2);
      expect(remaining[0]!.id).toBe(block1.id);
      expect(remaining[0]!.sortOrder).toBe(0);
      expect(remaining[1]!.id).toBe(block3.id);
      expect(remaining[1]!.sortOrder).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // reorderContentBlocks
  // ---------------------------------------------------------------------------

  describe("reorderContentBlocks", () => {
    it("reorders blocks atomically", async () => {
      if (!hasDatabaseUrl()) return;

      const block1 = await repo.upsertContentBlock(
        portfolioPromocionId,
        "DESCRIPCION_GENERAL",
        { text: "First" },
        USER_ID,
      );
      const block2 = await repo.upsertContentBlock(
        portfolioPromocionId,
        "MEMORIA_CALIDADES",
        { items: [{ title: "Calidad", description: "Buena" }] },
        USER_ID,
      );
      const block3 = await repo.upsertContentBlock(
        portfolioPromocionId,
        "UBICACION_SERVICIOS",
        { items: [{ service: "Metro", distance: "200m" }] },
        USER_ID,
      );

      // Reverse order: [block3, block2, block1]
      await repo.reorderContentBlocks(portfolioPromocionId, [
        block3.id,
        block2.id,
        block1.id,
      ]);

      const blocks = await repo.findAllContentBlocks(portfolioPromocionId);
      expect(blocks).toHaveLength(3);
      expect(blocks[0]!.id).toBe(block3.id);
      expect(blocks[0]!.sortOrder).toBe(0);
      expect(blocks[1]!.id).toBe(block2.id);
      expect(blocks[1]!.sortOrder).toBe(1);
      expect(blocks[2]!.id).toBe(block1.id);
      expect(blocks[2]!.sortOrder).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // validateBlocksForPublish
  // ---------------------------------------------------------------------------

  describe("validateBlocksForPublish", () => {
    it("returns valid result when all blocks have valid payloads", async () => {
      if (!hasDatabaseUrl()) return;

      await repo.upsertContentBlock(
        portfolioPromocionId,
        "DESCRIPCION_GENERAL",
        { text: "Valid description" },
        USER_ID,
      );
      await repo.upsertContentBlock(
        portfolioPromocionId,
        "MEMORIA_CALIDADES",
        { items: [{ title: "Calidad", description: "Buena" }] },
        USER_ID,
      );

      const result = await repo.validateBlocksForPublish(portfolioPromocionId);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns invalid result when a block has invalid payload", async () => {
      if (!hasDatabaseUrl()) return;

      // Create a block with invalid payload (items is not a valid array)
      await withTenant(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO promocion_content_blocks (tenant_id, promocion_id, block_type, payload, sort_order, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            TENANT_ID,
            portfolioPromocionId,
            "MEMORIA_CALIDADES",
            JSON.stringify({ items: "not-an-array" }),
            0,
            USER_ID,
          ],
        );
      });

      const result = await repo.validateBlocksForPublish(portfolioPromocionId);

      expect(result.valid).toBe(false);
      expect(result.errors).not.toHaveLength(0);
    });

    it("detects empty required fields as invalid (Zod min length)", async () => {
      if (!hasDatabaseUrl()) return;

      // Insert a block with empty title (now rejected by Zod min(1))
      await withTenant(pool, TENANT_ID, async (client) => {
        await client.query(
          `INSERT INTO promocion_content_blocks (tenant_id, promocion_id, block_type, payload, sort_order, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            TENANT_ID,
            portfolioPromocionId,
            "MEMORIA_CALIDADES",
            JSON.stringify({ items: [{ title: "", description: "Desc" }] }),
            0,
            USER_ID,
          ],
        );
      });

      const result = await repo.validateBlocksForPublish(portfolioPromocionId);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.blockType).toBe("MEMORIA_CALIDADES");
    });

    it("returns valid result when no blocks exist", async () => {
      if (!hasDatabaseUrl()) return;

      const result = await repo.validateBlocksForPublish(portfolioPromocionId);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
