import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

export function hasDatabaseUrl(): boolean {
  return Boolean(databaseUrl);
}

export function createTestPool(): Pool {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  return new Pool({ connectionString: databaseUrl });
}

type PoolClient = Awaited<ReturnType<Pool["connect"]>>;

export async function withTenant<T>(
  pool: Pool,
  tenantId: string,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    // set_config(..., true) = transaction-local (equivale a SET LOCAL) y
    // admite parámetros bind; SET LOCAL ... = $1 es error de sintaxis en PG.
    await client.query(
      "SELECT set_config('app.current_tenant_id', $1, true)",
      [tenantId],
    );
    const result = await operation(client);
    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
