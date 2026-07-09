import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Snapshot update mode is controlled exclusively via the environment variable
 * CONTRACT_UPDATE_SNAPSHOTS, set by the script `test:contract:update` in
 * package.json. The `isUpdateMode()` function in snapshot-serializer.ts reads
 * this env var directly.
 *
 * Using process.argv is fragile under Vitest's fork pool because arguments
 * are not guaranteed to propagate to worker processes. Using an env var set
 * before the vitest command is the reliable approach (M4 fix).
 */

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(".", "src"),
      "@app": path.resolve(".", "app"),
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    fileParallelism: false,
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}", "tests/**/*.contract.spec.{ts,tsx}", "src/**/*.spec.{ts,tsx}", "app/**/*.spec.{ts,tsx}"],
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["app/**/*.ts", "app/**/*.tsx", "src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "*.config.ts",
        "*.config.mjs",
        "app/layout.tsx",
        "app/(public)/page.tsx",
        "app/(auth)/layout.tsx",
        "src/infrastructure/db/schema/**",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
