import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Serializable representation of a Zod schema field for snapshot comparison.
 *
 * Uses JSON Schema format (draft 2020-12) produced by zod's built-in
 * `toJSONSchema()` method. This ensures deterministic, diff-friendly output
 * that captures types, optional/required, nested objects, enums, and
 * constraints (min, max, format).
 */
export type SchemaSnapshot = Record<string, unknown>;

/**
 * Result of reading a snapshot file from disk.
 * - `"missing"`: file does not exist (ENOENT)
 * - `"corrupt"`: file exists but is invalid JSON or not a valid snapshot
 * - `"ok"`: file was read and parsed successfully
 */
export type SnapshotReadResult =
  | { status: "ok"; data: SchemaSnapshot }
  | { status: "missing"; filePath: string }
  | { status: "corrupt"; filePath: string; parseError: string };

/**
 * Serializes a Zod schema into a JSON-compatible object preserving the
 * complete structure: field names, types, optional/required status, nested
 * objects, enum values, and validation constraints.
 *
 * This is used to generate versioned snapshots for contract tests. The output
 * is deterministic and diff-friendly in git.
 *
 * Uses zod's built-in `toJSONSchema()` which produces standard JSON Schema
 * (draft 2020-12). This is more robust and maintainable than manually
 * inspecting zod's internal types.
 *
 * @param schema - The Zod schema to serialize.
 * @returns A plain JSON-compatible object representing the schema.
 */
export function serializeSchema(schema: z.ZodType<unknown>): SchemaSnapshot {
  // For ZodObject schemas, `toJSONSchema` returns a complete JSON Schema
  // document. For other types, it returns a JSON Schema type definition.
  const jsonSchema = schema.toJSONSchema();

  // Serialize to a plain JSON object (handles BigInt, etc.)
  return JSON.parse(JSON.stringify(jsonSchema)) as SchemaSnapshot;
}

/**
 * Checks whether snapshot update mode is active.
 *
 * When true, snapshot divergence tests should skip comparison and instead
 * write the current serialized schema to the snapshot file.
 *
 * Uses an environment variable `CONTRACT_UPDATE_SNAPSHOTS` set before the
 * vitest command. This works reliably across forked workers, unlike
 * `process.argv` which doesn't propagate in Vitest's fork pool (M4 fix).
 *
 * CLI usage: `CONTRACT_UPDATE_SNAPSHOTS=true pnpm test:contract`
 * Script usage: `pnpm test:contract:update`
 */
export function isUpdateMode(): boolean {
  return process.env.CONTRACT_UPDATE_SNAPSHOTS === "true";
}

/**
 * Read a snapshot JSON file from disk, distinguishing three outcomes:
 *
 * 1. **ok** — file exists and is valid JSON → returns the parsed snapshot.
 * 2. **missing** — file does not exist (ENOENT) → caller can create it.
 * 3. **corrupt** — file exists but is invalid JSON or not a plain object →
 *    caller MUST fail with a clear message and NOT overwrite the file.
 *
 * @param snapshotsDir - Directory containing snapshot files.
 * @param filename - Snapshot file name (e.g. "promocion-response.schema.json").
 * @returns A discriminated result object.
 */
export function readSnapshot(
  snapshotsDir: string,
  filename: string,
): SnapshotReadResult {
  const filePath = path.join(snapshotsDir, filename);

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      return {
        status: "corrupt",
        filePath,
        parseError: `Invalid JSON: ${(parseErr as Error).message}`,
      };
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {
        status: "corrupt",
        filePath,
        parseError: "Snapshot root value is not a JSON object",
      };
    }

    return { status: "ok", data: parsed as SchemaSnapshot };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { status: "missing", filePath };
    }
    throw err;
  }
}

/**
 * Write a snapshot to disk, creating the directory if needed.
 *
 * @param snapshotsDir - Directory to write the snapshot into.
 * @param filename - Snapshot file name.
 * @param data - The schema snapshot data to persist.
 */
export function writeSnapshot(
  snapshotsDir: string,
  filename: string,
  data: SchemaSnapshot,
): void {
  fs.mkdirSync(snapshotsDir, { recursive: true });
  fs.writeFileSync(
    path.join(snapshotsDir, filename),
    JSON.stringify(data, null, 2) + "\n",
  );
}
