import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promociones, leads } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import { hasDatabaseUrl, withTenant } from "./db";
import {
  seedTenantFixtures,
  cleanupFixtures,
  createTenantAContext,
  createTenantBContext,
  TENANT_A_ID,
  TENANT_B_ID,
} from "./setup";
import { createLeadService } from "@/features/engagement/server/create-lead-action";

function collectTsFiles(dir: string, fs: typeof import("node:fs"), path: typeof import("node:path")): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath, fs, path));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function scanFileForSetViolations(
  file: string,
  fs: typeof import("node:fs"),
): string[] {
  const raw = fs.readFileSync(file, "utf-8");
  const stripped = raw.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/.*/gu, "");
  const violations: string[] = [];

  for (const [index, line] of stripped.split("\n").entries()) {
    if (/\bSET\s+/u.test(line) && !/SET\s+LOCAL/iu.test(line)) {
      violations.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  }

  return violations;
}

function findSetWithoutLocalViolations(
  fs: typeof import("node:fs"),
  path: typeof import("node:path"),
): string[] {
  const scanDirs = [
    path.resolve("src/infrastructure/tenant"),
    path.resolve("src/infrastructure/db/repositories"),
  ];

  const violations: string[] = [];

  for (const dir of scanDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = collectTsFiles(dir, fs, path);
    for (const file of files) {
      violations.push(...scanFileForSetViolations(file, fs));
    }
  }

  return violations;
}

class TestRepository extends TenantAwareRepository {
  async findPromociones() {
    return this.withTransaction(async (tx) => {
      return tx.select().from(promociones);
    });
  }

  async countPromociones() {
    return this.withTransaction(async (tx) => {
      const rows = await tx.select().from(promociones);
      return rows.length;
    });
  }

  async countLeads() {
    return this.withTransaction(async (tx) => {
      const rows = await tx.select().from(leads);
      return rows.length;
    });
  }

  async insertLead(promocionId: string, name: string, email: string) {
    return this.withTransaction(async (tx) => {
      const [lead] = await tx
        .insert(leads)
        .values({
          tenantId: this.ctx.getTenantId(),
          promocionId,
          source: "commercial",
          channel: "FORM",
          name,
          email,
          status: "NEW",
        })
        .returning();

      if (!lead) {
        throw new Error("Lead insert did not return a row");
      }

      return lead;
    });
  }
}

describe.skipIf(!hasDatabaseUrl())("Tenant isolation", () => {
  beforeAll(seedTenantFixtures);
  afterAll(cleanupFixtures);

  it("T022: Tenant A queries promociones and only sees Tenant A promociones", async () => {
    const ctx = await createTenantAContext();
    const repo = new TestRepository(ctx);

    const rows = await repo.findPromociones();

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.tenantId).toBe(TENANT_A_ID);
    }
  });

  it("T023: Tenant A inserts a lead and Tenant B cannot see it", async () => {
    const ctxA = await createTenantAContext();
    const ctxB = await createTenantBContext();
    const repoA = new TestRepository(ctxA);
    const repoB = new TestRepository(ctxB);

    const promos = await repoA.findPromociones();
    const targetPromo = promos.find((row) => row.slug === "promo-a-1");
    expect(targetPromo).toBeDefined();

    const leadsBeforeB = await repoB.countLeads();

    const lead = await repoA.insertLead(
      targetPromo!.id,
      "Nuevo Lead A",
      "nuevo-lead-a@example.com",
    );

    expect(lead.tenantId).toBe(TENANT_A_ID);

    const leadsAfterA = await repoA.countLeads();
    const leadsAfterB = await repoB.countLeads();

    expect(leadsAfterA).toBeGreaterThan(leadsAfterB);
    expect(leadsAfterB).toBe(leadsBeforeB);
  });

  it("T024: Concurrent writes from A and B result in correct row counts per tenant", async () => {
    const ctxA = await createTenantAContext();
    const ctxB = await createTenantBContext();
    const repoA = new TestRepository(ctxA);
    const repoB = new TestRepository(ctxB);

    const promosA = await repoA.findPromociones();
    const promosB = await repoB.findPromociones();
    const promoA = promosA.find((row) => row.slug === "promo-a-1");
    const promoB = promosB.find((row) => row.slug === "promo-b-1");
    expect(promoA).toBeDefined();
    expect(promoB).toBeDefined();

    const initialA = await repoA.countLeads();
    const initialB = await repoB.countLeads();

    const writesA = Array.from({ length: 3 }, (_, index) =>
      repoA.insertLead(
        promoA!.id,
        `Concurrent A ${index}`,
        `concurrent-a-${index}@example.com`,
      ),
    );
    const writesB = Array.from({ length: 2 }, (_, index) =>
      repoB.insertLead(
        promoB!.id,
        `Concurrent B ${index}`,
        `concurrent-b-${index}@example.com`,
      ),
    );

    await Promise.all([...writesA, ...writesB]);

    const finalA = await repoA.countLeads();
    const finalB = await repoB.countLeads();

    expect(finalA).toBe(initialA + 3);
    expect(finalB).toBe(initialB + 2);
  });

  it("T025: No SET without LOCAL in transactional tenant paths", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");

    expect(findSetWithoutLocalViolations(fs, path)).toEqual([]);
  });

  it("T026: createLeadService rejects promocionId from another tenant", async () => {
    const ctxA = await createTenantAContext();
    const pool = (await import("./setup")).getTestPool();

    // Get promocion ID from tenant B
    const promoBId = await withTenant(pool, TENANT_B_ID, async (client) => {
      const result = await client.query<{ id: string }>(
        "SELECT id FROM promociones WHERE slug = 'promo-b-1' LIMIT 1",
      );
      return result.rows[0]?.id;
    });

    expect(promoBId).toBeDefined();

    const result = await createLeadService(
      ctxA,
      {
        name: "Test User",
        email: "test@example.com",
        message: "Test message for isolation.",
        consent: true,
      },
      promoBId,
      "203.0.113.1",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Promoción no encontrada");
  });
});
