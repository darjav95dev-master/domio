// Re-export shared test utilities for repository tests
// These are the same patterns used by promocion.repository.spec.ts
export {
  createMockAuthCtx,
  setupMockTransaction,
  createMockTx,
} from "@/infrastructure/db/repositories/__tests__/test-utils";
