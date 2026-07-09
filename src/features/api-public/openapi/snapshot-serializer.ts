import { z } from "zod";

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
 * Uses an environment variable `CONTRACT_UPDATE_SNAPSHOTS` set by the vitest
 * config or by the CI pipeline. This works reliably across forked workers,
 * unlike `process.argv` which doesn't propagate in Vitest's fork pool.
 *
 * CLI usage: `CONTRACT_UPDATE_SNAPSHOTS=true pnpm test:contract`
 * Script usage: `pnpm tsx scripts/update-contract-snapshots.ts`
 */
export function isUpdateMode(): boolean {
  return process.env.CONTRACT_UPDATE_SNAPSHOTS === "true";
}
