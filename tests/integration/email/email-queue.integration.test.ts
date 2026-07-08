import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { EmailService } from "@/infrastructure/email/email.service";
import { EmailRepository } from "@/infrastructure/email/email.repository";
import { processQueue } from "@/infrastructure/email/worker";
import { EmailProviderError } from "@/infrastructure/email/types";
import { getTemplate } from "@/infrastructure/email/templates";
import { EMAIL_TEMPLATE_NAMES } from "@/shared/constants/email-templates";
import type { EmailQueue, NewEmailQueue } from "@/infrastructure/db/schema/email-queue";
import type { WorkerResult } from "@/infrastructure/email/types";
import type { ResendClient } from "@/infrastructure/email/types";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/infrastructure/db/schema";

// ─── Constants (avoid sonarjs/no-duplicate-string) ──────────────────────
const STATUS_PENDING = "PENDING" as const;
const BASE_TIME_STR = "2026-07-08T12:00:00Z";
const AGENT_EMAIL = "agent@domio.com";

// ─── In-memory email queue store ──────────────────────────────────────────
// Simulates the email_queue table so that EmailService.enqueue writes rows
// that processQueue can read and update — no real database needed.

class InMemoryEmailStore {
  private rows: Map<string, EmailQueue> = new Map();
  private idCounter = 0;

  /** Insert a new row (simulates repository.insert) */
  insert(item: NewEmailQueue): EmailQueue {
    const id = `integ-test-${++this.idCounter}`;
    const now = new Date();
    const row: EmailQueue = {
      id,
      toEmail: item.toEmail ?? "",
      template: item.template ?? "",
      payload: (item.payload ?? {}) as Record<string, unknown>,
      status: (item.status ?? STATUS_PENDING) as "PENDING" | "SENT" | "FAILED",
      attempts: item.attempts ?? 0,
      nextAttemptAt: item.nextAttemptAt ?? null,
      lastError: null,
      createdAt: now,
      sentAt: null,
    };
    this.rows.set(id, row);
    return row;
  }

  /** Find pending eligible rows (simulates repository.findPendingEligible) */
  findPendingEligible(limit: number): EmailQueue[] {
    const pending: EmailQueue[] = [];
    for (const row of this.rows.values()) {
      if (
        row.status === STATUS_PENDING &&
        (row.nextAttemptAt === null || row.nextAttemptAt <= new Date())
      ) {
        pending.push({ ...row });
      }
    }
    // Sort: next_attempt_at ASC NULLS FIRST (matching the SQL query)
    pending.sort((a, b) => {
      if (a.nextAttemptAt === null && b.nextAttemptAt === null) return 0;
      if (a.nextAttemptAt === null) return -1;
      if (b.nextAttemptAt === null) return 1;
      return a.nextAttemptAt.getTime() - b.nextAttemptAt.getTime();
    });
    return pending.slice(0, limit);
  }

  /** Mark a row as sent (simulates repository.markSent) */
  markSent(id: string): void {
    const row = this.rows.get(id);
    if (!row) return;
    row.status = "SENT";
    row.sentAt = new Date();
    row.attempts += 1;
  }

  /** Mark a row as failed (simulates repository.markFailed) */
  markFailed(id: string, error: string): void {
    const row = this.rows.get(id);
    if (!row) return;
    row.status = "FAILED";
    row.lastError = error;
    row.attempts += 1;
  }

  /** Mark a row for retry (simulates repository.markRetry) */
  markRetry(id: string, error: string, nextAttemptAt: Date): void {
    const row = this.rows.get(id);
    if (!row) return;
    row.lastError = error;
    row.nextAttemptAt = nextAttemptAt;
    row.attempts += 1;
  }

  /** Get a row by id for assertions */
  getRow(id: string): EmailQueue | undefined {
    return this.rows.get(id);
  }

  /** Get all rows for assertions */
  getAllRows(): EmailQueue[] {
    return Array.from(this.rows.values());
  }

  /** Clear all rows */
  clear(): void {
    this.rows.clear();
    this.idCounter = 0;
  }
}

// ─── Template registry using the real templates ───────────────────────────

const realTemplateRegistry = { getTemplate };

// ─── Valid payloads (matching template schemas) ───────────────────────────

const BACKOFFICE_URL = "https://panel.domio.com/leads/123";

const leadAssignedPayload = {
  agentName: "Ana García",
  leadName: "Carlos López",
  promotionName: "Residencial Marina",
  backofficeUrl: BACKOFFICE_URL,
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe("Email queue integration: enqueue -> process -> SENT/FAILED", () => {
  let store: InMemoryEmailStore;
  let mockResendClient: ResendClient & { send: Mock };
  let mockDb: NodePgDatabase<typeof schema>;

  beforeEach(() => {
    store = new InMemoryEmailStore();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(BASE_TIME_STR));

    // Create mock Resend client
    mockResendClient = {
      send: vi.fn().mockResolvedValue({ id: "email-mock-123" }),
    };

    // Create a minimal mock database that satisfies the type
    // (EmailRepository defaults use it, but our integration test
    //  manually wires all dependencies so it is never invoked)
    mockDb = {} as NodePgDatabase<typeof schema>;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Scenario 1: enqueue -> processing -> SENT ────────────────────────

  describe("Escenario 1: encolado -> procesamiento -> SENT", () => {
    it("completes the full flow: enqueue, process, mark as SENT", async () => {
      // Arrange: create repository that delegates to in-memory store
      const repository = new EmailRepository(mockDb);
      vi.spyOn(repository, "insert").mockImplementation((item) =>
        Promise.resolve(store.insert(item)),
      );
      vi.spyOn(repository, "findPendingEligible").mockImplementation((limit) =>
        Promise.resolve(store.findPendingEligible(limit)),
      );
      vi.spyOn(repository, "markSent").mockImplementation((id) => {
        store.markSent(id);
        return Promise.resolve();
      });
      vi.spyOn(repository, "markFailed").mockImplementation((id, error) => {
        store.markFailed(id, error);
        return Promise.resolve();
      });
      vi.spyOn(repository, "markRetry").mockImplementation(
        (id, error, nextAttemptAt) => {
          store.markRetry(id, error, nextAttemptAt);
          return Promise.resolve();
        },
      );

      const service = new EmailService(repository);

      // Act 1: Enqueue
      await service.enqueue({
        toEmail: AGENT_EMAIL,
        template: EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT,
        payload: leadAssignedPayload,
      });

      // Assert 1: Row was created in the store
      const allRows = store.getAllRows();
      expect(allRows).toHaveLength(1);
      const rowId = allRows[0]!.id;
      expect(allRows[0]!.status).toBe(STATUS_PENDING);
      expect(allRows[0]!.toEmail).toBe(AGENT_EMAIL);
      expect(allRows[0]!.template).toBe(EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT);
      expect(allRows[0]!.attempts).toBe(0);

      // Act 2: Process the queue
      const result = await processQueue(
        repository,
        mockResendClient,
        realTemplateRegistry,
      );

      // Assert 2: Email was sent via Resend
      expect(mockResendClient.send).toHaveBeenCalledTimes(1);
      expect(mockResendClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: AGENT_EMAIL,
          subject: expect.stringContaining("Nuevo lead"),
        }),
      );

      // Assert 3: Row was marked as SENT
      const updatedRow = store.getRow(rowId);
      expect(updatedRow).toBeDefined();
      expect(updatedRow!.status).toBe("SENT");
      expect(updatedRow!.sentAt).toBeDefined();
      expect(updatedRow!.attempts).toBe(1);

      // Assert 4: WorkerResult reflects the processed row
      expect(result).toEqual<WorkerResult>({
        processed: 1,
        sent: 1,
        failed: 0,
        retried: 0,
      });
    });
  });

  // ─── Scenario 2: enqueue -> backoff x5 -> FAILED ─────────────────────

  describe("Escenario 2: encolado -> backoff exponencial -> FAILED tras 5 intentos", () => {
    it("retries with exponential backoff and marks FAILED after 5 attempts", async () => {
      // Arrange: create repository that delegates to in-memory store
      const repository = new EmailRepository(mockDb);

      // We'll manually seed rows with different attempt counts so
      // the first processQueue call pushes them over the edge.
      // Strategy: insert 3 rows with attempts=4,3,2, then process.
      // Row with attempts=4 -> immediately FAILED (5th attempt)
      // Row with attempts=3 -> markRetry (attempts becomes 4)
      // Row with attempts=2 -> markRetry (attempts becomes 3)

      // Seed the store directly
      const rowFailed = store.insert({
        toEmail: AGENT_EMAIL,
        template: EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT,
        payload: leadAssignedPayload,
        status: STATUS_PENDING,
        attempts: 4,
        nextAttemptAt: new Date(BASE_TIME_STR),
      });
      const rowRetry1 = store.insert({
        toEmail: "retry1@domio.com",
        template: EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT,
        payload: leadAssignedPayload,
        status: STATUS_PENDING,
        attempts: 3,
        nextAttemptAt: new Date(BASE_TIME_STR),
      });
      const rowRetry2 = store.insert({
        toEmail: "retry2@domio.com",
        template: EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT,
        payload: leadAssignedPayload,
        status: STATUS_PENDING,
        attempts: 2,
        nextAttemptAt: new Date(BASE_TIME_STR),
      });
      const rowFresh = store.insert({
        toEmail: "fresh@domio.com",
        template: EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT,
        payload: leadAssignedPayload,
        status: STATUS_PENDING,
        attempts: 0,
        nextAttemptAt: new Date(BASE_TIME_STR),
      });

      // Wire repository to store
      vi.spyOn(repository, "insert").mockImplementation((item) =>
        Promise.resolve(store.insert(item)),
      );
      vi.spyOn(repository, "findPendingEligible").mockImplementation((limit) =>
        Promise.resolve(store.findPendingEligible(limit)),
      );
      vi.spyOn(repository, "markSent").mockImplementation((id) => {
        store.markSent(id);
        return Promise.resolve();
      });
      vi.spyOn(repository, "markFailed").mockImplementation((id, error) => {
        store.markFailed(id, error);
        return Promise.resolve();
      });
      vi.spyOn(repository, "markRetry").mockImplementation(
        (id, error, nextAttemptAt) => {
          store.markRetry(id, error, nextAttemptAt);
          return Promise.resolve();
        },
      );

      // Make Resend fail for all rows
      const providerError = "Service unavailable";
      mockResendClient.send.mockRejectedValue(
        new EmailProviderError(providerError),
      );

      // Act: First processing pass
      const result1 = await processQueue(
        repository,
        mockResendClient,
        realTemplateRegistry,
      );

      // Assert: Row with 4 attempts -> FAILED (5th attempt)
      expect(store.getRow(rowFailed.id)!.status).toBe("FAILED");
      expect(store.getRow(rowFailed.id)!.attempts).toBe(5);
      expect(store.getRow(rowFailed.id)!.lastError).toBe(providerError);

      // Row with 3 attempts -> retried (now has 4)
      expect(store.getRow(rowRetry1.id)!.status).toBe(STATUS_PENDING);
      expect(store.getRow(rowRetry1.id)!.attempts).toBe(4);
      expect(store.getRow(rowRetry1.id)!.lastError).toBe(providerError);

      // Row with 2 attempts -> retried (now has 3)
      expect(store.getRow(rowRetry2.id)!.status).toBe(STATUS_PENDING);
      expect(store.getRow(rowRetry2.id)!.attempts).toBe(3);
      expect(store.getRow(rowRetry2.id)!.lastError).toBe(providerError);

      // Row with 0 attempts -> retried (now has 1)
      expect(store.getRow(rowFresh.id)!.status).toBe(STATUS_PENDING);
      expect(store.getRow(rowFresh.id)!.attempts).toBe(1);
      expect(store.getRow(rowFresh.id)!.lastError).toBe(providerError);

      // Check result counts: 1 failed, 3 retried
      expect(result1).toMatchObject({
        processed: 4,
        sent: 0,
        failed: 1,
        retried: 3,
      });

      // Act 2: Advance time and process again (now rowRetry1 at 4 attempts -> FAILED)
      vi.advanceTimersByTime(2 * 60 * 1000); // +2 minutes

      // Update next_attempt_at for rows that were retried so they are eligible
      const rows = store.getAllRows();
      for (const row of rows) {
        if (row.status === STATUS_PENDING && row.nextAttemptAt) {
          // Move nextAttemptAt to the past so they're picked up
          row.nextAttemptAt = new Date();
        }
      }

      await processQueue(
        repository,
        mockResendClient,
        realTemplateRegistry,
      );

      // rowRetry1 (attempts=4) should now be FAILED
      expect(store.getRow(rowRetry1.id)!.status).toBe("FAILED");
      expect(store.getRow(rowRetry1.id)!.attempts).toBe(5);

      // Verify that after enough cycles with failure, rows end up FAILED
      // Simulate remaining cycles for all rows
      for (let cycle = 0; cycle < 5; cycle++) {
        for (const row of store.getAllRows()) {
          if (row.status === STATUS_PENDING) {
            row.nextAttemptAt = new Date(); // make eligible
          }
        }
        await processQueue(
          repository,
          mockResendClient,
          realTemplateRegistry,
        );
      }

      // Now all rows should be FAILED
      const finalRows = store.getAllRows();
      for (const row of finalRows) {
        expect(row.status).toBe("FAILED");
      }
    });
  });

  // ─── Scenario 2b: clean enqueue -> 5 cycles -> FAILED ────────────────

  describe("Escenario 2b: email fresco -> 5 fallos -> FAILED", () => {
    it("transitions a fresh PENDING row through backoff cycles to FAILED", async () => {
      const repository = new EmailRepository(mockDb);
      vi.spyOn(repository, "insert").mockImplementation((item) =>
        Promise.resolve(store.insert(item)),
      );
      vi.spyOn(repository, "findPendingEligible").mockImplementation((limit) =>
        Promise.resolve(store.findPendingEligible(limit)),
      );
      vi.spyOn(repository, "markSent").mockImplementation((id) => {
        store.markSent(id);
        return Promise.resolve();
      });
      vi.spyOn(repository, "markFailed").mockImplementation((id, error) => {
        store.markFailed(id, error);
        return Promise.resolve();
      });
      vi.spyOn(repository, "markRetry").mockImplementation(
        (id, error, nextAttemptAt) => {
          store.markRetry(id, error, nextAttemptAt);
          return Promise.resolve();
        },
      );

      const service = new EmailService(repository);

      // Enqueue a fresh email
      await service.enqueue({
        toEmail: "fresh@domio.com",
        template: EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT,
        payload: leadAssignedPayload,
      });

      const rowId = store.getAllRows()[0]!.id;
      expect(store.getRow(rowId)!.status).toBe(STATUS_PENDING);
      expect(store.getRow(rowId)!.attempts).toBe(0);

      // Resend always fails
      mockResendClient.send.mockRejectedValue(
        new EmailProviderError("Provider error"),
      );

      // Cycle 1: attempts 0 -> 1 (retry)
      let result = await processQueue(repository, mockResendClient, realTemplateRegistry);
      expect(store.getRow(rowId)!.attempts).toBe(1);
      expect(store.getRow(rowId)!.status).toBe(STATUS_PENDING);
      expect(result).toMatchObject({ processed: 1, sent: 0, failed: 0, retried: 1 });

      // Make eligible again
      store.getRow(rowId)!.nextAttemptAt = new Date();

      // Cycle 2: attempts 1 -> 2 (retry)
      result = await processQueue(repository, mockResendClient, realTemplateRegistry);
      expect(store.getRow(rowId)!.attempts).toBe(2);
      expect(store.getRow(rowId)!.status).toBe(STATUS_PENDING);
      expect(result).toMatchObject({ processed: 1, sent: 0, failed: 0, retried: 1 });

      store.getRow(rowId)!.nextAttemptAt = new Date();

      // Cycle 3: attempts 2 -> 3 (retry)
      await processQueue(repository, mockResendClient, realTemplateRegistry);
      expect(store.getRow(rowId)!.attempts).toBe(3);
      expect(store.getRow(rowId)!.status).toBe(STATUS_PENDING);

      store.getRow(rowId)!.nextAttemptAt = new Date();

      // Cycle 4: attempts 3 -> 4 (retry)
      await processQueue(repository, mockResendClient, realTemplateRegistry);
      expect(store.getRow(rowId)!.attempts).toBe(4);
      expect(store.getRow(rowId)!.status).toBe(STATUS_PENDING);

      store.getRow(rowId)!.nextAttemptAt = new Date();

      // Cycle 5: attempts 4 -> 5 (FAILED)
      result = await processQueue(repository, mockResendClient, realTemplateRegistry);
      expect(store.getRow(rowId)!.attempts).toBe(5);
      expect(store.getRow(rowId)!.status).toBe("FAILED");
      expect(store.getRow(rowId)!.lastError).toBe("Provider error");
      expect(result).toMatchObject({ processed: 1, sent: 0, failed: 1, retried: 0 });

      // Verify no more processing happens
      store.getRow(rowId)!.nextAttemptAt = new Date(); // even if eligible...
      result = await processQueue(repository, mockResendClient, realTemplateRegistry);
      expect(result).toMatchObject({ processed: 0, sent: 0, failed: 0, retried: 0 });
    });
  });

  // ─── Verification: real template registry works with worker ──────────

  describe("Real template registry integration", () => {
    it("renders content from the real template during processQueue", async () => {
      const repository = new EmailRepository(mockDb);
      vi.spyOn(repository, "insert").mockImplementation((item) =>
        Promise.resolve(store.insert(item)),
      );
      vi.spyOn(repository, "findPendingEligible").mockImplementation((limit) =>
        Promise.resolve(store.findPendingEligible(limit)),
      );
      vi.spyOn(repository, "markSent").mockImplementation((id) => {
        store.markSent(id);
        return Promise.resolve();
      });
      vi.spyOn(repository, "markFailed").mockImplementation((id, error) => {
        store.markFailed(id, error);
        return Promise.resolve();
      });
      vi.spyOn(repository, "markRetry").mockImplementation(
        (id, error, nextAttemptAt) => {
          store.markRetry(id, error, nextAttemptAt);
          return Promise.resolve();
        },
      );

      const service = new EmailService(repository);

      await service.enqueue({
        toEmail: "template-test@domio.com",
        template: EMAIL_TEMPLATE_NAMES.LEAD_CONFIRMATION,
        payload: {
          leadName: "Test Lead",
          promotionName: "Test Promotion",
          contactEmail: "info@domio.com",
        },
      });

      mockResendClient.send.mockResolvedValue({ id: "email-456" });

      await processQueue(repository, mockResendClient, realTemplateRegistry);

      // Verify the Resend client received content from the real template
      expect(mockResendClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "template-test@domio.com",
          subject: expect.stringContaining("recibido"),
          html: expect.stringContaining("Test Lead"),
          text: expect.stringContaining("Test Promotion"),
        }),
      );
    });
  });
});
