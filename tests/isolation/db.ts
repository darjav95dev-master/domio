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
    await client.query("SET LOCAL app.current_tenant_id = $1", [tenantId]);
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
