import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DrizzleClient = NodePgDatabase<typeof schema>;

// ponytail: cache pool+client on globalThis so Next dev HMR reuses one Pool
// instead of leaking a fresh one (and its connections) on every hot reload,
// which exhausts Postgres' max connections and makes the next query hang.
const globalForDb = globalThis as unknown as { __domioDb?: DrizzleClient };

let dbClient: DrizzleClient | null = globalForDb.__domioDb ?? null;

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
    // Fail fast instead of hanging forever when the pool is saturated.
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

  dbClient = drizzle(pool, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__domioDb = dbClient;
  }

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
