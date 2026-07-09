/**
 * One-time backfill script for API key prefixes.
 *
 * **Context:**
 * A `key_prefix` column was added to `api_keys` to enable O(1) lookup
 * by prefix (first 8 chars of the plaintext key), reducing bcrypt
 * comparisons from O(n) to O(1).
 *
 * New keys (created after the migration) already store the prefix.
 * Legacy keys without a stored prefix are included in every auth
 * lookup via `isNull(apiKeys.keyPrefix)`, forcing a bcrypt compare
 * against every unmatched legacy key.
 *
 * **What this script does:**
 * Since the plaintext key cannot be recovered from the bcrypt hash,
 * this script identifies all active keys without a prefix and prints
 * them for manual rotation by an administrator.
 *
 * **Usage:**
 * ```bash
 * npx tsx scripts/backfill-api-key-prefix.ts
 * ```
 *
 * **Post-run:** Rotate the listed keys via the admin panel:
 * 1. Generate a new key (which will have the prefix stored)
 * 2. Update integrations with the new key
 * 3. Revoke the old key
 *
 * After all legacy keys are rotated, the `isNull` fallback in
 * `defaultFindActiveKeys` will return zero candidates, completing
 * the O(1) optimization.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { isNull } from "drizzle-orm";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import { apiKeys } from "../src/infrastructure/db/schema";

// ─── Load .env.local if present ──────────────────────────────────────────────

const envLocalPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  console.log("🔍 Looking for API keys without a stored prefix...\n");

  const legacyKeys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      tenantId: apiKeys.tenantId,
      isActive: apiKeys.isActive,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(isNull(apiKeys.keyPrefix));

  if (legacyKeys.length === 0) {
    console.log("✅ All API keys have a prefix stored. Nothing to do.");
    await pool.end();
    return;
  }

  const activeLegacyKeys = legacyKeys.filter((k) => k.isActive);

  console.log(`Found ${legacyKeys.length} legacy key(s) without prefix:`);
  console.log(`  • ${activeLegacyKeys.length} active — need rotation`);
  console.log(`  • ${legacyKeys.length - activeLegacyKeys.length} revoked — no action needed\n`);

  for (const key of activeLegacyKeys) {
    console.log(`  [${key.id}]`);
    console.log(`    Name:       ${key.name}`);
    console.log(`    Tenant:     ${key.tenantId}`);
    console.log(`    Created:    ${key.createdAt.toISOString()}`);
    console.log(`    Last used:  ${key.lastUsedAt?.toISOString() ?? "never"}`);
    console.log();
  }

  console.log("─── How to rotate ───────────────────────────────────────────────");
  console.log("1. For each key above, go to Panel → API Keys");
  console.log("2. Create a new key with the same name");
  console.log("3. Update the integration with the new key");
  console.log("4. Revoke the old key");
  console.log("5. Run this script again to verify no legacy keys remain");
  console.log("─────────────────────────────────────────────────────────────────\n");

  await pool.end();
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
