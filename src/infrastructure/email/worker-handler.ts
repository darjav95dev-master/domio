import { EmailRepository } from "@/infrastructure/email/email.repository";
import { processQueue } from "@/infrastructure/email/worker";
import type { TemplateRegistry } from "@/infrastructure/email/worker";
import { ResendClientImpl } from "@/infrastructure/email/resend.client";
import { getTemplate } from "@/infrastructure/email/templates";
import { db } from "@/infrastructure/db/client";
import type {
  ResendClient,
  WorkerResult,
} from "@/infrastructure/email/types";

// ─── Default template registry adapter ───────────────────────────────────

function createDefaultTemplateRegistry(): TemplateRegistry {
  return { getTemplate };
}

// ─── Default Resend client factory ────────────────────────────────────────

function createDefaultResendClient(): ResendClient {
  return new ResendClientImpl();
}

// ─── Default repository factory ───────────────────────────────────────────

function createDefaultRepository(): EmailRepository {
  return new EmailRepository(db);
}

// ─── Worker loop options ──────────────────────────────────────────────────

export interface WorkerLoopOptions {
  /** Process queue function (defaults to processQueue from worker.ts) */
  processQueueFn?: typeof processQueue;
  /** Email repository (defaults to new EmailRepository(db)) */
  repository?: EmailRepository;
  /** Resend client (defaults to new ResendClientImpl()) */
  resendClient?: ResendClient;
  /** Template registry (defaults to { getTemplate }) */
  templateRegistry?: TemplateRegistry;
  /** Interval between cycles in ms (default: 30000) */
  intervalMs?: number;
  /** AbortSignal to stop the loop gracefully */
  signal: AbortSignal;
  /** Called after each successful cycle with the WorkerResult */
  onResult?: (result: WorkerResult) => void;
  /** Called if processQueue throws */
  onError?: (error: Error) => void;
  /** Called after the loop exits */
  onShutdown?: () => void;
}

// ─── runWorkerLoop ────────────────────────────────────────────────────────
// Core loop for standalone mode. Runs processQueue in a loop at the
// configured interval until the AbortSignal is triggered.
// Handles graceful shutdown: finishes the current cycle before stopping.

export async function runWorkerLoop(
  options: WorkerLoopOptions,
): Promise<void> {
  const repository = options.repository ?? createDefaultRepository();
  const resendClient = options.resendClient ?? createDefaultResendClient();
  const templateRegistry =
    options.templateRegistry ?? createDefaultTemplateRegistry();
  const processFn = options.processQueueFn ?? processQueue;
  const intervalMs = options.intervalMs ?? 30000;
  const { signal } = options;

  while (!signal.aborted) {
    try {
      const result = await processFn(repository, resendClient, templateRegistry);
      options.onResult?.(result);
    } catch (error) {
      options.onError?.(error as Error);
    }

    // Check again in case abort happened during processQueue
    if (signal.aborted) {
      break;
    }

    // Wait for the interval or until abort signal fires
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, intervalMs);
      const onAbort = () => {
        clearTimeout(timer);
        resolve();
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  options.onShutdown?.();
}

// ─── Serverless handler (Vercel cron trigger) ────────────────────────────
// FR-013: Invocable como función serverless con cron trigger.
// Procesa la cola una sola vez y retorna WorkerResult como JSON.

export default async function handler(): Promise<Response> {
  const repository = createDefaultRepository();
  const resendClient = createDefaultResendClient();
  const templateRegistry = createDefaultTemplateRegistry();

  try {
    const result = await processQueue(repository, resendClient, templateRegistry);
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
