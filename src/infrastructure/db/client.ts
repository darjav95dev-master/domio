import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DrizzleClient = NodePgDatabase<typeof schema>;

let dbClient: DrizzleClient | null = null;

function ensureDb(): DrizzleClient {
  if (dbClient) {
    return dbClient;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not defined");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  dbClient = drizzle(pool, { schema });

  return dbClient;
}

export const db: DrizzleClient = new Proxy<DrizzleClient>(
  {} as DrizzleClient,
  {
    get(_target, prop: string | symbol): unknown {
      return ensureDb()[prop as keyof DrizzleClient];
    },
  },
);

export type Database = typeof db;
