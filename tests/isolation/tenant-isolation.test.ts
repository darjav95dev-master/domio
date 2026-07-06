import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promociones, leads } from "@/infrastructure/db/schema";
import { TenantAwareRepository } from "@/infrastructure/db/repositories/TenantAwareRepository";
import { hasDatabaseUrl } from "./db";
import {
  seedTenantFixtures,
  cleanupFixtures,
  createTenantAContext,
  createTenantBContext,
  TENANT_A_ID,
} from "./setup";

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

    const scanDirs = [
      path.resolve("src/infrastructure/tenant"),
      path.resolve("src/infrastructure/db/repositories"),
    ];

    function collectTsFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...collectTsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".ts")) {
          files.push(fullPath);
        }
      }

      return files;
    }

    const violations: string[] = [];

    for (const dir of scanDirs) {
      if (!fs.existsSync(dir)) {
        continue;
      }

      const files = collectTsFiles(dir);
      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");

        for (const [index, line] of lines.entries()) {
          const code = line.replace(/\/\/.*/u, "");
          if (/SET\s+/iu.test(code) && !/SET\s+LOCAL/iu.test(code)) {
            violations.push(`${file}:${index + 1}: ${line.trim()}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
