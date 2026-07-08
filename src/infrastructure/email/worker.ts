import type { EmailRepository } from "@/infrastructure/email/email.repository";
import {
  EmailProviderError,
  type ResendClient,
  type WorkerResult,
} from "@/infrastructure/email/types";
import { db } from "@/infrastructure/db/client";
import type { Transaction } from "@/infrastructure/tenant/TenantContext";

// ─── Types ────────────────────────────────────────────────────────────────

export interface TemplateRegistry {
  getTemplate(name: string): {
    render(payload: Record<string, unknown>): {
      subject: string;
      html: string;
      text: string;
    };
  };
}

// ─── Backoff calculation ──────────────────────────────────────────────────
// FR-006: next_attempt_at = now() + 2^(attempts+1) × 60 segundos
// attempts = valor actual (antes de incrementar)

export function calculateNextAttempt(attempts: number): Date {
  return new Date(Date.now() + Math.pow(2, attempts + 1) * 60_000);
}

// ─── Worker ───────────────────────────────────────────────────────────────
// Procesa la cola email_queue: reclama filas PENDING elegibles, invoca el
// proveedor de email (Resend), y actualiza el estado según el resultado.
//
// FR-005: Recoge registros PENDING cuyo next_attempt_at <= now()
// FR-007: Marca FAILED tras 5 intentos (attempts >= 4)
// FR-009: Usa FOR UPDATE SKIP LOCKED (en el repositorio)

export async function processQueue(
  repository: EmailRepository,
  resendClient: ResendClient,
  templateRegistry: TemplateRegistry,
): Promise<WorkerResult> {
  return db.transaction(async (tx: Transaction) => {
    const pending = await repository.findPendingEligible(10, tx);

    let sent = 0;
    let failed = 0;
    let retried = 0;

    for (const row of pending) {
      try {
        // Renderizar template
        const template = templateRegistry.getTemplate(row.template);
        const content = template.render(row.payload ?? {});

        // Enviar via Resend
        await resendClient.send({
          to: row.toEmail,
          subject: content.subject,
          html: content.html,
          text: content.text,
        });

        // Exito
        await repository.markSent(row.id, tx);
        sent++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";

        // Los errores del proveedor (EmailProviderError) son transitorios
        if (error instanceof EmailProviderError) {
          if (row.attempts >= 4) {
            // 5o intento fallido — marcar como FAILED permanentemente
            await repository.markFailed(row.id, message, tx);
            failed++;
          } else {
            // Reintentar con backoff exponencial
            const nextAttempt = calculateNextAttempt(row.attempts);
            await repository.markRetry(row.id, message, nextAttempt, tx);
            retried++;
          }
        } else {
          // Errores no-transitorios (template no encontrado, payload invalido,
          // error de renderizado) — marcar FAILED inmediatamente
          await repository.markFailed(row.id, message, tx);
          failed++;
        }
      }
    }

    return { processed: pending.length, sent, failed, retried };
  });
}
