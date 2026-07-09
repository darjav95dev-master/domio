import { describe, it, expect, beforeAll } from "vitest";
import { promocionResponseSchema } from "@/features/api-public/schemas/promocion-response.schema";
import { leadInstitutionalSchema } from "@/features/api-public/schemas/lead-institutional.schema";
import {
  serializeSchema,
  isUpdateMode,
} from "@/features/api-public/openapi/snapshot-serializer";
import * as fs from "node:fs";
import * as path from "node:path";

const SNAPSHOTS_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "tests/contract/v1/snapshots",
);

/**
 * Helper: read a snapshot JSON file, returning null if it doesn't exist or is invalid.
 */
function readSnapshot(filename: string): Record<string, unknown> | null {
  const filePath = path.join(SNAPSHOTS_DIR, filename);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe("Snapshot Divergence Detection (v1)", () => {
  describe("promocionResponseSchema snapshot", () => {
    const SNAPSHOT_FILE = "promocion-response.schema.json";

    it("should match the stored snapshot", () => {
      const current = serializeSchema(promocionResponseSchema);
      const stored = readSnapshot(SNAPSHOT_FILE);

      // If snapshot doesn't exist, write it and fail with a meaningful message
      if (stored === null) {
        writeSnapshot(SNAPSHOT_FILE, current);
        expect(stored).not.toBeNull();
        return;
      }

      // If --update flag is passed, write current snapshot and pass
      if (isUpdateMode()) {
        writeSnapshot(SNAPSHOT_FILE, current);
        return;
      }

      // Deep equality comparison
      expect(current).toEqual(stored);
    });
  });

  describe("leadInstitutionalSchema snapshot", () => {
    const SNAPSHOT_FILE = "lead-institutional.schema.json";

    it("should match the stored snapshot", () => {
      const current = serializeSchema(leadInstitutionalSchema);
      const stored = readSnapshot(SNAPSHOT_FILE);

      if (stored === null) {
        writeSnapshot(SNAPSHOT_FILE, current);
        expect(stored).not.toBeNull();
        return;
      }

      if (isUpdateMode()) {
        writeSnapshot(SNAPSHOT_FILE, current);
        return;
      }

      expect(current).toEqual(stored);
    });
  });
});

/**
 * Write a snapshot to disk, creating the directory if needed.
 */
function writeSnapshot(
  filename: string,
  data: Record<string, unknown>,
): void {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(SNAPSHOTS_DIR, filename),
    JSON.stringify(data, null, 2) + "\n",
  );
}
