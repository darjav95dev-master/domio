#!/usr/bin/env tsx
/**
 * Standalone email worker entry point.
 *
 * FR-012: Ejecutable como `pnpm worker:emails` en desarrollo.
 * Procesa la cola email_queue en bucle con intervalo configurable.
 * Responde a SIGTERM/SIGINT con shutdown limpio.
 *
 * Uso:
 *   pnpm worker:emails
 *   WORKER_INTERVAL_MS=15000 pnpm worker:emails
 */

import { runWorkerLoop } from "@/infrastructure/email/worker-handler";

// ─── Configuration ────────────────────────────────────────────────────────

const INTERVAL_MS = parseInt(
  process.env.WORKER_INTERVAL_MS ?? "30000",
  10,
);

// ─── Signal handling ──────────────────────────────────────────────────────

const abortController = new AbortController();

function handleSignal(signal: string): void {
  console.log(`[worker-emails] Received ${signal}, shutting down gracefully...`);
  abortController.abort();
}

process.on("SIGTERM", () => handleSignal("SIGTERM"));
process.on("SIGINT", () => handleSignal("SIGINT"));

// ─── Start ────────────────────────────────────────────────────────────────

console.log(
  `[worker-emails] Starting email worker loop (interval: ${INTERVAL_MS}ms)`,
);
console.log("[worker-emails] Press Ctrl+C to stop.");

runWorkerLoop({
  intervalMs: INTERVAL_MS,
  signal: abortController.signal,
  onResult: (result) => {
    console.log(
      `[worker-emails] Cycle complete: ${result.processed} processed, ` +
        `${result.sent} sent, ${result.failed} failed, ${result.retried} retried`,
    );
  },
  onError: (error) => {
    console.error(`[worker-emails] Cycle error: ${error.message}`);
  },
  onShutdown: () => {
    console.log("[worker-emails] Worker stopped gracefully.");
    process.exit(0);
  },
});
