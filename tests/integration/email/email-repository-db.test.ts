// @vitest-environment node
//
// Test contra Postgres real. Los demás tests de la cola mockean
// findPendingEligible o la sustituyen por un store en memoria que ya devuelve
// camelCase, así que el mapeo columna→propiedad nunca se ejercitaba: la consulta
// usaba SQL crudo y devolvía `to_email`, dejando `row.toEmail` en undefined.
// Resend rechazaba cada envío con "Missing `to` field" y ningún email de lead
// llegó a salir. Este test falla si eso vuelve a pasar.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Pool } from "pg";
import { createTestPool, hasDatabaseUrl } from "../../isolation/db";
import { EmailRepository } from "@/infrastructure/email/email.repository";

const TEMPLATE = "lead-confirmation";
const TRUNCATE_QUEUE = "DELETE FROM email_queue";

let pool: Pool;

beforeAll(async () => {
  if (!hasDatabaseUrl()) return;
  pool = createTestPool();
  await pool.query("SELECT 1");
  await pool.query(TRUNCATE_QUEUE);
});

afterAll(async () => {
  if (!hasDatabaseUrl()) return;
  await pool.query(TRUNCATE_QUEUE);
  await pool.end();
});

describe.skipIf(!hasDatabaseUrl())("EmailRepository · findPendingEligible", () => {
  it("devuelve las filas con las columnas mapeadas al schema (toEmail, no to_email)", async () => {
    const repository = new EmailRepository();

    await repository.insert({
      toEmail: "destinatario@example.com",
      template: TEMPLATE,
      payload: { leadName: "Ada" },
    });

    const [row] = await repository.findPendingEligible(10);

    expect(row).toBeDefined();
    // El fallo original: undefined aquí, y Resend respondía "Missing `to` field".
    expect(row.toEmail).toBe("destinatario@example.com");
    expect(row.template).toBe(TEMPLATE);
    expect(row.status).toBe("PENDING");
    expect(row.attempts).toBe(0);
  });

  it("prioriza los recién encolados (next_attempt_at NULL) sobre los que esperan reintento", async () => {
    const repository = new EmailRepository();
    await pool.query(TRUNCATE_QUEUE);

    await pool.query(
      `INSERT INTO email_queue (to_email, template, status, attempts, next_attempt_at)
       VALUES ('reintento@example.com', 'lead-confirmation', 'PENDING', 2, now() - interval '1 hour')`,
    );
    await repository.insert({
      toEmail: "nuevo@example.com",
      template: TEMPLATE,
      payload: {},
    });

    const rows = await repository.findPendingEligible(10);

    expect(rows).toHaveLength(2);
    expect(rows[0].toEmail).toBe("nuevo@example.com");
  });
});
