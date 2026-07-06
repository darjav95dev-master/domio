import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@/": path.resolve(__dirname, "./src/"),
    },
  },
  test: {
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["app/**/*.ts", "app/**/*.tsx", "src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "*.config.ts",
        "*.config.mjs",
        "app/layout.tsx",
        "app/(public)/page.tsx",
        "app/(auth)/layout.tsx",
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
