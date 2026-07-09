import { describe, it, expect } from "vitest";
import { promocionResponseSchema } from "@/features/api-public/schemas/promocion-response.schema";
import { leadInstitutionalSchema } from "@/features/api-public/schemas/lead-institutional.schema";
import {
  serializeSchema,
  readSnapshot,
  writeSnapshot,
  isUpdateMode,
} from "@/features/api-public/openapi/snapshot-serializer";
import * as path from "node:path";

const SNAPSHOTS_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "tests/contract/v1/snapshots",
);

// ---------------------------------------------------------------------------
// Consolidated Snapshot Divergence Detection
//
// For each versioned schema, the test:
// 1. Serialises the current zod schema to a JSON Schema snapshot.
// 2. Reads the stored snapshot from disk.
//    - If MISSING: writes it and FAILS with "Snapshot generated" message.
//    - If CORRUPT: FAILS with "Snapshot corrupt" message WITHOUT writing.
//    - If update mode: writes current snapshot and PASSES.
//    - Otherwise: deep-compares current vs stored.
//
// This consolidation eliminates the duplication of the snapshot comparison
// logic across three test files (M2), and properly distinguishes missing
// vs corrupt snapshots (C3).
// ---------------------------------------------------------------------------

const SCHEMAS = [
  {
    name: "promocionResponseSchema",
    file: "promocion-response.schema.json",
    schema: promocionResponseSchema,
  },
  {
    name: "leadInstitutionalSchema",
    file: "lead-institutional.schema.json",
    schema: leadInstitutionalSchema,
  },
] as const;

describe("Snapshot Divergence Detection (v1)", () => {
  describe.each(SCHEMAS)("$name snapshot", ({ file, schema }) => {
    it("should match the stored snapshot — run with CONTRACT_UPDATE_SNAPSHOTS=true to update", () => {
      const current = serializeSchema(schema);
      const result = readSnapshot(SNAPSHOTS_DIR, file);

      switch (result.status) {
        case "ok": {
          if (isUpdateMode()) {
            writeSnapshot(SNAPSHOTS_DIR, file, current);
            return; // Updated, pass
          }
          // Deep equality comparison
          expect(current).toEqual(result.data);
          return;
        }

        case "missing": {
          // Snapshot does not exist → write it and fail with clear message
          writeSnapshot(SNAPSHOTS_DIR, file, current);
          expect.unreachable(
            `Snapshot generated: ${result.filePath}. ` +
              `Review the diff and commit the snapshot if the change is intentional. ` +
              `To auto-update: CONTRACT_UPDATE_SNAPSHOTS=true pnpm test:contract`,
          );
          return;
        }

        case "corrupt": {
          // Snapshot exists but is invalid → fail WITHOUT writing
          expect.unreachable(
            `Snapshot corrupt: ${result.filePath}. ` +
              `Parse error: ${result.parseError}. ` +
              `Fix or delete the snapshot file manually before re-running.`,
          );
          return;
        }
      }
    });
  });
});
