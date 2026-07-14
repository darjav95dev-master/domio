// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Pool } from "pg";
import {
  createTestPool,
  hasDatabaseUrl,
  resetTenantData,
  seedTenant,
  withTenant,
} from "../isolation/db";
import { setupPasswordAction } from "@/features/team/actions/setup-password.action";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const EMAIL = "invitado@domio.dev";
// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- fixture de test, no una credencial real
const NEW_PASSWORD = "una-contrasena-larga";
// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- fixture de test: contraseña que NO coincide, para probar el rechazo
const MISMATCHED_PASSWORD = "otra-distinta";

let pool: Pool;

/** Crea el usuario invitado tal y como lo hace UserRepository.create. */
async function inviteUser(expiresAt: Date): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await withTenant(pool, TENANT_ID, async (client) => {
    await client.query(
      `INSERT INTO users (tenant_id, email, name, role, invitation_token_hash, invitation_token_expires)
       VALUES ($1, $2, 'Invitado', 'AGENT', $3, $4)`,
      [TENANT_ID, EMAIL, tokenHash, expiresAt],
    );
  });

  return token;
}

/** Lee el usuario invitado. `users` tiene RLS: hace falta el contexto de tenant. */
async function readUser() {
  return withTenant(pool, TENANT_ID, async (client) => {
    const { rows } = await client.query(
      `SELECT password_hash, invitation_token_hash, invitation_token_expires
       FROM users WHERE email = $1`,
      [EMAIL],
    );
    return rows[0];
  });
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeAll(async () => {
  if (!hasDatabaseUrl()) return;
  pool = createTestPool();
  await pool.query("SELECT 1");
});

afterAll(async () => {
  if (!hasDatabaseUrl()) return;
  await pool.end();
});

beforeEach(async () => {
  if (!hasDatabaseUrl()) return;
  await resetTenantData(pool);
  await seedTenant(pool, TENANT_ID, "domio", "Domio Inmobiliaria");
});

describe.skipIf(!hasDatabaseUrl())("setupPasswordAction", () => {
  it("establece la contraseña y consume el token", async () => {
    const token = await inviteUser(new Date(Date.now() + 3_600_000));

    const result = await setupPasswordAction(
      form({ token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }),
    );

    expect(result.success).toBe(true);

    const row = await readUser();

    // La contraseña queda hasheada con bcrypt y sirve para el login.
    expect(await bcrypt.compare(NEW_PASSWORD, row.password_hash)).toBe(true);
    // Un solo uso: el token se borra.
    expect(row.invitation_token_hash).toBeNull();
    expect(row.invitation_token_expires).toBeNull();
  });

  it("rechaza un token caducado sin tocar la contraseña", async () => {
    const token = await inviteUser(new Date(Date.now() - 1000));

    const result = await setupPasswordAction(
      form({ token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }),
    );

    expect(result.success).toBe(false);
    expect((await readUser()).password_hash).toBeNull();
  });

  it("rechaza un token que no existe", async () => {
    await inviteUser(new Date(Date.now() + 3_600_000));

    const result = await setupPasswordAction(
      form({
        token: crypto.randomBytes(32).toString("hex"),
        password: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }),
    );

    expect(result.success).toBe(false);
  });

  it("rechaza si las contraseñas no coinciden", async () => {
    const token = await inviteUser(new Date(Date.now() + 3_600_000));

    const result = await setupPasswordAction(
      form({
        token,
        password: NEW_PASSWORD,
        confirmPassword: MISMATCHED_PASSWORD,
      }),
    );

    expect(result.success).toBe(false);
  });
});
