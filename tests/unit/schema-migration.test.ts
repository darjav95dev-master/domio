import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve(__dirname, "../../src/infrastructure/db/migrations");

function readGeneratedMigration(): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((name) =>
    name.endsWith(".sql"),
  );

  if (files.length === 0) {
    throw new Error("No generated migration file found");
  }

  return readFileSync(resolve(MIGRATIONS_DIR, files[0]), "utf-8");
}

describe("generated drizzle migration", () => {
  const migration = readGeneratedMigration();

  it("creates at least 19 tables", () => {
    const tableMatches = migration.matchAll(
      /CREATE TABLE "([a-z_]+)"/gu,
    );
    const tables = [...tableMatches].map((match) => match[1]);

    expect(tables.length).toBeGreaterThanOrEqual(19);
  });

  it("includes core tables", () => {
    expect(migration).toContain('CREATE TABLE "tenants"');
    expect(migration).toContain('CREATE TABLE "users"');
  });

  it("includes domain tables", () => {
    expect(migration).toContain('CREATE TABLE "promociones"');
    expect(migration).toContain('CREATE TABLE "tipologias"');
    expect(migration).toContain('CREATE TABLE "unidades"');
    expect(migration).toContain('CREATE TABLE "media_assets"');
    expect(migration).toContain('CREATE TABLE "promocion_content_blocks"');
    expect(migration).toContain('CREATE TABLE "promocion_history"');
  });

  it("includes leads and compliance tables", () => {
    expect(migration).toContain('CREATE TABLE "leads"');
    expect(migration).toContain('CREATE TABLE "lead_read_marks"');
    expect(migration).toContain('CREATE TABLE "lead_notes"');
    expect(migration).toContain('CREATE TABLE "lead_history"');
    expect(migration).toContain('CREATE TABLE "consent_records"');
    expect(migration).toContain('CREATE TABLE "arsop_requests"');
  });

  it("includes infrastructure tables", () => {
    expect(migration).toContain('CREATE TABLE "content_blocks"');
    expect(migration).toContain('CREATE TABLE "contact_config"');
    expect(migration).toContain('CREATE TABLE "content_history"');
    expect(migration).toContain('CREATE TABLE "email_queue"');
    expect(migration).toContain('CREATE TABLE "api_keys"');
  });

  it("defines promociones location as geometry(Point,4326)", () => {
    expect(migration).toContain('"location" geometry(Point,4326) NOT NULL');
  });

  it("creates tenant-first composite indexes on domain tables", () => {
    expect(migration).toContain(
      'CREATE INDEX "promociones_tenant_status_idx"',
    );
    expect(migration).toContain(
      'CREATE INDEX "tipologias_tenant_promocion_idx"',
    );
    expect(migration).toContain(
      'CREATE INDEX "unidades_tenant_tipologia_idx"',
    );
    expect(migration).toContain(
      'CREATE INDEX "leads_tenant_promocion_idx"',
    );
    expect(migration).toContain(
      'CREATE INDEX "media_assets_tenant_owner_idx"',
    );
  });

  it("creates construction_status index on promociones", () => {
    expect(migration).toContain(
      'CREATE INDEX "promociones_tenant_construction_status_idx"',
    );
  });

  it("creates a GIST spatial index on promociones.location", () => {
    expect(migration).toContain(
      'CREATE INDEX "promociones_location_gist_idx" ON "promociones" USING gist ("location")',
    );
  });

  it("creates the partial unique cover constraint", () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "media_assets_tenant_owner_cover_idx" ON "media_assets" USING btree ("tenant_id","owner_id") WHERE "media_assets"."is_cover" = true',
    );
  });

  it("enables RLS on every table with tenant_id", () => {
    const tablesWithTenantId = [
      "users",
      "promociones",
      "tipologias",
      "unidades",
      "media_assets",
      "promocion_content_blocks",
      "promocion_history",
      "leads",
      "lead_read_marks",
      "lead_notes",
      "lead_history",
      "consent_records",
      "arsop_requests",
      "content_blocks",
      "contact_config",
      "content_history",
      "api_keys",
    ];

    for (const table of tablesWithTenantId) {
      expect(migration).toContain(
        `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`,
      );
      expect(migration).toContain(
        `CREATE POLICY "${table}_isolation" ON "${table}" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.current_tenant_id')::uuid)`,
      );
    }
  });

  it("does not enable RLS on email_queue", () => {
    expect(migration).not.toContain(
      'ALTER TABLE "email_queue" ENABLE ROW LEVEL SECURITY',
    );
    expect(migration).not.toContain(
      'CREATE POLICY "email_queue_isolation"',
    );
  });
});
