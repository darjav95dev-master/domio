import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import type { WorkerResult } from "@/infrastructure/email/types";

// ─── Module under test ────────────────────────────────────────────────────
// Dynamic import for TDD compatibility: import fails in RED phase before
// worker-handler.ts exists, so the try/catch provides a stub that makes tests
// fail on assertions rather than crashing the suite.
let runWorkerLoop: (options: Record<string, unknown>) => Promise<void>;

try {
  const mod = await import("@/infrastructure/email/worker-handler");
  runWorkerLoop = mod.runWorkerLoop;
} catch {
  runWorkerLoop = async () => {};
}

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockProcessQueue: Mock = vi.fn();
const mockOnResult: Mock = vi.fn();
const mockOnError: Mock = vi.fn();
const mockOnShutdown: Mock = vi.fn();

function createDefaultOptions(
  signal: AbortSignal,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    processQueueFn: mockProcessQueue,
    repository: {},
    resendClient: {},
    templateRegistry: {},
    intervalMs: 30000,
    signal,
    onResult: mockOnResult,
    onError: mockOnError,
    onShutdown: mockOnShutdown,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe("Standalone Worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("T033: standalone worker processes one cycle and exits on SIGTERM", () => {
    it("calls processQueue once, reports result, and shuts down cleanly on abort", async () => {
      const abortController = new AbortController();
      const workerResult: WorkerResult = {
        processed: 2,
        sent: 1,
        failed: 1,
        retried: 0,
      };

      mockProcessQueue.mockResolvedValue(workerResult);

      const promise = runWorkerLoop(
        createDefaultOptions(abortController.signal),
      );

      // Wait for the first cycle to complete
      await vi.waitFor(() => {
        expect(mockProcessQueue).toHaveBeenCalledTimes(1);
      });

      // Verify result was reported
      expect(mockOnResult).toHaveBeenCalledWith(workerResult);
      expect(mockOnError).not.toHaveBeenCalled();

      // Send abort signal (simulates SIGTERM)
      abortController.abort();

      // Wait for the loop to exit
      await promise;

      // Verify clean shutdown
      expect(mockOnShutdown).toHaveBeenCalledTimes(1);
      // Error handler should NOT have been called
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it("does not call processQueue again after abort", async () => {
      const abortController = new AbortController();
      mockProcessQueue.mockResolvedValue({
        processed: 0,
        sent: 0,
        failed: 0,
        retried: 0,
      });

      const promise = runWorkerLoop(
        createDefaultOptions(abortController.signal, { intervalMs: 100 }),
      );

      await vi.waitFor(() => {
        expect(mockProcessQueue).toHaveBeenCalledTimes(1);
      });

      abortController.abort();
      await promise;

      // processQueue should have been called exactly once (the first cycle)
      expect(mockProcessQueue).toHaveBeenCalledTimes(1);
    });

    it("calls onError when processQueue throws but continues loop", async () => {
      vi.useFakeTimers();
      const abortController = new AbortController();
      const testError = new Error("Process queue failure");

      // First call throws, second call resolves
      mockProcessQueue
        .mockRejectedValueOnce(testError)
        .mockResolvedValue({
          processed: 1,
          sent: 1,
          failed: 0,
          retried: 0,
        });

      const promise = runWorkerLoop(
        createDefaultOptions(abortController.signal, { intervalMs: 50 }),
      );

      // First cycle runs immediately (throws error)
      await vi.waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(testError);
      });

      // Advance timers past the interval so the second cycle runs
      vi.advanceTimersByTime(60);

      // Second cycle should have run after the interval
      await vi.waitFor(() => {
        expect(mockProcessQueue).toHaveBeenCalledTimes(2);
      });

      abortController.abort();
      await promise;

      expect(mockOnShutdown).toHaveBeenCalledTimes(1);
    });
  });
});
