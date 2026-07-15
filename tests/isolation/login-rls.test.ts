import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Pool } from "pg";
import type { NextAuthOptions } from "next-auth";
import { createTestPool, hasDatabaseUrl, resetTenantData, seedTenant, withTenant } from "./db";

// El rol de esta suite (`test`) NO es superusuario ni tiene bypassrls, así que
// las políticas de RLS se aplican de verdad: es el mundo al que migra producción.
// Estas pruebas fijan lo que el login debe cumplir ahí.

const TENANT = "77777777-7777-7777-7777-777777777777";
const OTHER_TENANT = "88888888-8888-8888-8888-888888888888";
const EMAIL = "admin@login-rls.test";
const OTHER_EMAIL = "ajeno@login-rls.test";
// Generadas, no literales: así el linter no las confunde con credenciales reales.
const PASSWORD = `pw-${randomUUID()}`;
const WRONG_PASSWORD = `pw-${randomUUID()}`;

type AuthorizeFn = (
  credentials: Record<string, string> | undefined,
) => Promise<{ id: string; tenant_id: string } | null>;

async function loadAuthorize(): Promise<AuthorizeFn> {
  vi.resetModules();
  process.env.PUBLIC_TENANT_ID = TENANT;

  const { authConfig } = (await import("@/infrastructure/auth/auth.config")) as {
    authConfig: NextAuthOptions;
  };
  // `provider.authorize` es el envoltorio de NextAuth (valida el request y
  // devuelve null fuera de una petición real); el callback nuestro vive en
  // `options.authorize`, que es el que queremos ejercitar.
  const provider = authConfig.providers[0] as unknown as {
    authorize?: AuthorizeFn;
    options?: { authorize?: AuthorizeFn };
  };
  const authorize = provider.options?.authorize ?? provider.authorize;

  if (!authorize) {
    throw new Error("No se encontró authorize en el provider de credenciales");
  }

  return authorize;
}

async function seedUser(pool: Pool, tenantId: string, email: string): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await withTenant(pool, tenantId, async (client) => {
    await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, name, role, is_active)
       VALUES ($1, $2, $3, 'Usuario de prueba', 'ADMIN', true)`,
      [tenantId, email, passwordHash],
    );
  });
}

describe.skipIf(!hasDatabaseUrl())("Login con RLS aplicándose", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createTestPool();
    await pool.query("SELECT 1");
    await resetTenantData(pool);
    await seedTenant(pool, TENANT, "login-rls-tenant", "Login RLS Tenant");
    await seedTenant(pool, OTHER_TENANT, "login-rls-otro", "Login RLS Otro");
    await seedUser(pool, TENANT, EMAIL);
    await seedUser(pool, OTHER_TENANT, OTHER_EMAIL);
  });

  afterAll(async () => {
    await pool.end();
  });

  // El login anterior consultaba `users` a pelo, sin poner app.current_tenant_id.
  // Con el rol restringido eso ni siquiera devuelve cero filas: la política
  // (tenant_id = current_setting('app.current_tenant_id')::uuid) no puede castear
  // el valor vacío y la consulta falla. Este test fija esa frontera.
  it("consultar users sin contexto de tenant es imposible con el rol restringido", async () => {
    await expect(
      pool.query("SELECT id FROM users WHERE email = $1", [
        EMAIL,
      ]),
    ).rejects.toThrow(/invalid input syntax for type uuid|unrecognized configuration parameter/);
  });

  it("autentica al usuario del tenant del despliegue", async () => {
    const authorize = await loadAuthorize();

    const user = await authorize({
      email: EMAIL,
      password: PASSWORD,
    });

    expect(user).not.toBeNull();
    expect(user?.tenant_id).toBe(TENANT);
  });

  it("rechaza a un usuario de otro tenant aunque la contraseña sea correcta", async () => {
    const authorize = await loadAuthorize();

    const user = await authorize({
      email: OTHER_EMAIL,
      password: PASSWORD,
    });

    expect(user).toBeNull();
  });

  it("rechaza una contraseña incorrecta", async () => {
    const authorize = await loadAuthorize();

    const user = await authorize({
      email: EMAIL,
      password: WRONG_PASSWORD,
    });

    expect(user).toBeNull();
  });
});
