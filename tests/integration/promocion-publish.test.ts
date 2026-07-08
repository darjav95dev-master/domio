// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Pool } from "pg";
import {
  createTestPool,
  hasDatabaseUrl,
  resetTenantData,
  seedTenant,
  withTenant,
} from "../isolation/db";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000010";

// ---------------------------------------------------------------------------
// Mock auth before importing the route handler
// ---------------------------------------------------------------------------
vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: vi.fn(() =>
    Promise.resolve({
      userId: USER_ID,
      tenantId: TENANT_ID,
      role: "ADMIN" as const,
      name: "Test Admin",
    }),
  ),
}));

// ---------------------------------------------------------------------------
// SUT imports
// ---------------------------------------------------------------------------
import { PATCH } from "@app/api/internal/promociones/[id]/route";

let pool: Pool;
let promocionId: string;

beforeAll(async () => {
  if (!hasDatabaseUrl()) return;
  pool = createTestPool();
  await pool.query("SELECT 1");
  await resetTenantData(pool);
  await seedTenant(pool, TENANT_ID, "domio", "Domio Inmobiliaria");

  // Create an ADMIN user for the tenant context
  await withTenant(pool, TENANT_ID, async (client) => {
    await client.query(
      `INSERT INTO users (id, tenant_id, name, email, role)
       VALUES ($1, $2, 'Test Admin', 'admin-publish@test.com', 'ADMIN')
       ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_ID],
    );
  });

  // Create a DRAFT promoción without any media assets
  await withTenant(pool, TENANT_ID, async (client) => {
    const { rows } = await client.query(
      `INSERT INTO promociones (tenant_id, slug, name, kind, status, location, location_approx, map_privacy_mode)
       VALUES ($1, '', 'Publish Test Promo', 'external', 'DRAFT', 'POINT(0 0)', 'POINT(0 0)', 'EXACT')
       RETURNING id`,
      [TENANT_ID],
    );
    promocionId = rows[0].id;
  });
});

afterAll(async () => {
  if (pool) {
    await pool.query("TRUNCATE tenants RESTART IDENTITY CASCADE");
    await pool.end();
  }
});

describe("PATCH publish — media validation (FR-009 / FR-010)", () => {
  it("returns 422 with MEDIA_INVALID when publishing without gallery images", async () => {
    if (!hasDatabaseUrl()) return;

    const request = new NextRequest(
      new URL(`http://localhost/api/internal/promociones/${promocionId}`),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PUBLISHED",
          name: "Publish Test Promo",
          operation: "SALE",
          propertyType: "piso",
          mapPrivacyMode: "EXACT",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: promocionId }),
    });

    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.code).toBe("MEDIA_INVALID");
    expect(body.message).toContain("medios");
  });
});
