/**
 * update-contract-snapshots.ts
 *
 * Regenerates all contract test snapshots from the current zod schemas.
 *
 * Usage:
 *   pnpm tsx scripts/update-contract-snapshots.ts
 *
 * This will overwrite the existing snapshot files in tests/contract/v1/snapshots/
 * with the serialized representation of the current schemas. Use this after
 * intentionally modifying a zod schema to update the contract baseline.
 */
import { serializeSchema } from "../src/features/api-public/openapi/snapshot-serializer";
import { promocionResponseSchema } from "../src/features/api-public/schemas/promocion-response.schema";
import { leadInstitutionalSchema } from "../src/features/api-public/schemas/lead-institutional.schema";
import * as fs from "node:fs";
import * as path from "node:path";

const SNAPSHOTS_DIR = path.resolve(
  __dirname,
  "..",
  "tests/contract/v1/snapshots",
);

const SNAPSHOTS: Array<{
  filename: string;
  schema: Parameters<typeof serializeSchema>[0];
  label: string;
}> = [
  {
    filename: "promocion-response.schema.json",
    schema: promocionResponseSchema,
    label: "PromocionResponse",
  },
  {
    filename: "lead-institutional.schema.json",
    schema: leadInstitutionalSchema,
    label: "LeadInstitutionalInput",
  },
];

function main(): void {
  console.log("Updating contract snapshots...\n");

  // Ensure the snapshots directory exists
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

  let updated = 0;
  let errors = 0;

  for (const { filename, schema, label } of SNAPSHOTS) {
    const filePath = path.join(SNAPSHOTS_DIR, filename);

    try {
      const snapshot = serializeSchema(schema);
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2) + "\n");
      console.log(`  [OK] ${filename} (${label})`);
      updated++;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error(`  [ERR] ${filename} (${label}): ${message}`);
      errors++;
    }
  }

  console.log(
    `\nDone. ${updated} snapshot(s) updated${errors > 0 ? `, ${errors} error(s)` : ""}.`,
  );

  if (errors > 0) {
    process.exit(1);
  }
}

main();
