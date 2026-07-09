import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../../src/infrastructure/db/schema";
import { runSeed } from "../../../scripts/seed";

/**
 * Resets the database to a clean seed state for E2E tests.
 *
 * Strategy:
 * 1. TRUNCATE CASCADE all mutable domain tables (excluding `tenants`).
 * 2. Re-run the seed function to insert fresh seed data.
 * 3. Close the pool.
 *
 * Call this in `beforeAll` of each E2E spec file (not `beforeEach` — performance).
 *
 * @see constitution.md §3 — "Limpiar estado BD antes de cada test"
 * @see tasks.md T003
 */
export async function resetDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is not defined. " +
        "Ensure .env.local is loaded before running E2E tests.",
    );
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    // Phase 1: TRUNCATE CASCADE all mutable tables
    // Dynamically builds the list from tables that exist (avoids errors
    // when optional tables like Auth.js sessions aren't created yet).
    await pool.query(`
      DO $$ BEGIN
        CREATE TEMP TABLE _truncate_tables (name text) ON COMMIT DROP;

        INSERT INTO _truncate_tables VALUES
          ('lead_read_marks'),
          ('lead_notes'),
          ('lead_history'),
          ('consent_records'),
          ('arsop_requests'),
          ('email_queue'),
          ('content_history'),
          ('api_keys'),
          ('unidades'),
          ('tipologias'),
          ('promocion_content_blocks'),
          ('promocion_history'),
          ('media_assets'),
          ('leads'),
          ('promociones'),
          ('content_blocks'),
          ('contact_config'),
          ('users'),
          ('sessions'),
          ('accounts'),
          ('verification_tokens');

        -- Remove tables that don't exist
        DELETE FROM _truncate_tables t
        WHERE NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = t.name
        );

        -- Build and execute TRUNCATE
        IF EXISTS (SELECT 1 FROM _truncate_tables) THEN
          EXECUTE (
            'TRUNCATE TABLE ' || (
              SELECT string_agg(name, ', ' ORDER BY name)
              FROM _truncate_tables
            ) || ' CASCADE'
          );
        END IF;
      END $$;
    `);

    // Phase 2: Re-run the seed script logic
    await runSeed(db);
  } finally {
    await pool.end();
  }

  // Phase 3: Purge Next.js server-side cache (unstable_cache) so that
  // subsequent page renders fetch fresh promocion UUIDs from the new seed.
  // The dev server may have cached stale UUIDs from before the seed reset.
  //
  // The /api/internal/revalidate endpoint now requires session auth, so we
  // authenticate programmatically first via the Auth.js credentials provider.
  try {
    // Step 1: Get a CSRF token + cookie for the credentials login.
    // NextAuth validates both the body csrfToken AND the csrfToken cookie.
    const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
    const { csrfToken } = await csrfRes.json() as { csrfToken: string };
    const csrfCookie = csrfRes.headers.getSetCookie()
      .find((c: string) => c.startsWith("next-auth.csrf-token="))
      ?.split(";")[0] ?? "";

    // Step 2: Login as admin to get a session cookie.
    // Must send the CSRF cookie back so NextAuth can validate the CSRF token.
    const loginRes = await fetch(
      "http://localhost:3000/api/auth/callback/credentials",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: csrfCookie,
        },
        body: new URLSearchParams({
          csrfToken,
          email: "admin@domio.dev",
          // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- test credential matching seed
          password: "Domio2026!",
          callbackUrl: "/panel",
          json: "true",
        }),
        redirect: "manual",
      },
    );

    // Extract the session cookie from Set-Cookie headers.
    const cookies = loginRes.headers.getSetCookie();
    const sessionCookie = cookies.find((c: string) =>
      c.trim().startsWith("next-auth.session-token="),
    );
    const cookieValue = sessionCookie?.split(";")[0]?.trim() ?? "";

    // Step 3: Call revalidation with the session cookie.
    await fetch("http://localhost:3000/api/internal/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieValue,
      },
      body: JSON.stringify({
        tags: [
          "catalog",
          "contact:global",
          "layout:public",
          "promocion:residencial-las-americas",
          "promocion:apartamentos-costa-adeje",
          "promocion:villas-la-laguna",
          "promocion:pisos-santa-cruz-centro",
        ],
      }),
    });
  } catch {
    // The revalidation call is best-effort: if the server is not yet
    // listening (e.g. cold start), cache may still be fresh.
  }
}
