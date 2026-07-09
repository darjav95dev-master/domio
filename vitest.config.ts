import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Propagate the --update / -u flag to forked workers via env var.
 * The config file runs in the main process (before forking), so it can
 * read process.argv and set an environment variable visible to workers.
 */
const isUpdateMode = process.argv.some(
  (arg) => arg === "--update" || arg === "-u",
);
if (isUpdateMode) {
  process.env.CONTRACT_UPDATE_SNAPSHOTS = "true";
}

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
