import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { EmailProviderError } from "@/infrastructure/email/types";
import type { WorkerResult } from "@/infrastructure/email/types";
import type { EmailQueue } from "@/infrastructure/db/schema/email-queue";
import { EMAIL_TEMPLATE_NAMES } from "@/shared/constants/email-templates";

// ─── Mock db.transaction ────────────────────────────────────────────────
// processQueue wraps processing in db.transaction(FOR UPDATE SKIP LOCKED).
// We mock the db module so transaction runs the callback directly with a
// fake transaction handle, avoiding a real database connection.

vi.mock("@/infrastructure/db/client", () => ({
  db: {
    transaction: vi.fn(
      <T>(fn: (tx: Record<string, never>) => Promise<T>): Promise<T> =>
        fn({}),
    ),
  },
}));

// ─── Module under test ────────────────────────────────────────────────────
// Use dynamic import for TDD compatibility: the import fails in RED phase
// before worker.ts exists, so the try/catch provides a stub that makes tests
// fail on assertions rather than crashing the suite.
let processQueue: (
  repository: unknown,
  resendClient: unknown,
  templateRegistry: unknown,
) => Promise<WorkerResult>;

try {
  const worker = await import("@/infrastructure/email/worker");
  processQueue = worker.processQueue;
} catch {
  processQueue = async () => ({ processed: 0, sent: 0, failed: 0, retried: 0 });
}

// ─── Constants ────────────────────────────────────────────────────────────

const TEST_ROW_ID = "00000000-0000-0000-0000-000000000001";
const BASE_TIME = "2026-07-08T12:00:00Z";
const BACKOFFICE_URL = "https://panel.domio.com/leads/1";

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockFindPendingEligible: Mock = vi.fn();
const mockMarkSent: Mock = vi.fn();
const mockMarkFailed: Mock = vi.fn();
const mockMarkRetry: Mock = vi.fn();
const mockSend: Mock = vi.fn();
const mockGetTemplate: Mock = vi.fn();
const mockRender: Mock = vi.fn();

function createMockRepository() {
  return {
    findPendingEligible: mockFindPendingEligible,
    markSent: mockMarkSent,
    markFailed: mockMarkFailed,
    markRetry: mockMarkRetry,
  };
}

const mockResendClient = { send: mockSend };

const mockTemplateRegistry = { getTemplate: mockGetTemplate };

// ─── Helpers ──────────────────────────────────────────────────────────────

function fakeEmailRow(overrides: Partial<EmailQueue> = {}): EmailQueue {
  return {
    id: TEST_ROW_ID,
    toEmail: "agent@domio.com",
    template: EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT,
    payload: {
      agentName: "Ana García",
      leadName: "Carlos López",
      promotionName: "Residencial Marina",
      backofficeUrl: BACKOFFICE_URL,
    },
    status: "PENDING",
    attempts: 0,
    nextAttemptAt: new Date(BASE_TIME),
    lastError: null,
    createdAt: new Date(BASE_TIME),
    sentAt: null,
    ...overrides,
  };
}

const defaultContent = {
  subject: "Nuevo lead asignado",
  html: "<p>Hola Ana, tienes un nuevo lead.</p>",
  text: "Hola Ana, tienes un nuevo lead.",
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe("Email Worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(BASE_TIME));

    // Default mock setup: template exists and renders correctly
    mockGetTemplate.mockReturnValue({ render: mockRender });
    mockRender.mockReturnValue(defaultContent);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("T014: worker processes pending email and marks as SENT", () => {
    it("calls markSent when email is sent successfully", async () => {
      mockFindPendingEligible.mockResolvedValue([fakeEmailRow()]);
      mockSend.mockResolvedValue({ id: "email-123" });

      const result = await processQueue(
        createMockRepository(),
        mockResendClient,
        mockTemplateRegistry,
      );

      // Should call markSent for the processed row with transaction handle
      expect(mockMarkSent).toHaveBeenCalledTimes(1);
      expect(mockMarkSent).toHaveBeenCalledWith(
        TEST_ROW_ID,
        expect.any(Object),
      );

      // Should NOT call markFailed or markRetry
      expect(mockMarkFailed).not.toHaveBeenCalled();
      expect(mockMarkRetry).not.toHaveBeenCalled();

      // Should send the email with template content
      expect(mockSend).toHaveBeenCalledWith({
        to: "agent@domio.com",
        subject: defaultContent.subject,
        html: defaultContent.html,
        text: defaultContent.text,
      });

      expect(result).toEqual<WorkerResult>({
        processed: 1,
        sent: 1,
        failed: 0,
        retried: 0,
      });
    });
  });

  describe("T015: worker applies exponential backoff after failure", () => {
    it("calls markRetry with calculated next_attempt_at when send fails", async () => {
      mockFindPendingEligible.mockResolvedValue([
        fakeEmailRow({ id: "row-1", attempts: 0 }),
      ]);
      mockSend.mockRejectedValue(
        new EmailProviderError("Rate limit exceeded"),
      );

      const result = await processQueue(
        createMockRepository(),
        mockResendClient,
        mockTemplateRegistry,
      );

      // Should call markRetry with error, calculated next attempt, and transaction handle
      expect(mockMarkRetry).toHaveBeenCalledTimes(1);
      expect(mockMarkRetry).toHaveBeenCalledWith(
        "row-1",
        "Rate limit exceeded",
        new Date("2026-07-08T12:02:00Z"), // 2^(0+1) * 60s = 120s after 12:00:00
        expect.any(Object),
      );

      // Should NOT call markSent or markFailed
      expect(mockMarkSent).not.toHaveBeenCalled();
      expect(mockMarkFailed).not.toHaveBeenCalled();

      expect(result).toEqual<WorkerResult>({
        processed: 1,
        sent: 0,
        failed: 0,
        retried: 1,
      });
    });

    it("recalculates for attempts=3: next_attempt_at = +16 min", async () => {
      mockFindPendingEligible.mockResolvedValue([
        fakeEmailRow({ id: "row-2", attempts: 3 }),
      ]);
      mockSend.mockRejectedValue(new EmailProviderError("Timeout"));

      const result = await processQueue(
        createMockRepository(),
        mockResendClient,
        mockTemplateRegistry,
      );

      expect(mockMarkRetry).toHaveBeenCalledWith(
        "row-2",
        "Timeout",
        new Date("2026-07-08T12:16:00Z"), // 2^(3+1) * 60s = 960s = 16 min
        expect.any(Object),
      );

      expect(result).toEqual<WorkerResult>({
        processed: 1,
        sent: 0,
        failed: 0,
        retried: 1,
      });
    });
  });

  describe("T016: worker marks FAILED after 5 attempts", () => {
    it("calls markFailed when attempts >= 4 and send fails", async () => {
      mockFindPendingEligible.mockResolvedValue([
        fakeEmailRow({ id: "row-1", attempts: 4 }),
      ]);
      mockSend.mockRejectedValue(
        new EmailProviderError("Permanent failure"),
      );

      const result = await processQueue(
        createMockRepository(),
        mockResendClient,
        mockTemplateRegistry,
      );

      expect(mockMarkFailed).toHaveBeenCalledTimes(1);
      expect(mockMarkFailed).toHaveBeenCalledWith(
        "row-1",
        "Permanent failure",
        expect.any(Object),
      );

      // Should NOT mark for retry
      expect(mockMarkRetry).not.toHaveBeenCalled();
      expect(mockMarkSent).not.toHaveBeenCalled();

      expect(result).toEqual<WorkerResult>({
        processed: 1,
        sent: 0,
        failed: 1,
        retried: 0,
      });
    });

    it("does not retry when attempts=4 (5th attempt)", async () => {
      mockFindPendingEligible.mockResolvedValue([
        fakeEmailRow({ id: "row-1", attempts: 4 }),
      ]);
      mockSend.mockRejectedValue(
        new EmailProviderError("Server error"),
      );

      await processQueue(
        createMockRepository(),
        mockResendClient,
        mockTemplateRegistry,
      );

      // markFailed is called, markRetry is NOT called
      expect(mockMarkFailed).toHaveBeenCalledTimes(1);
      expect(mockMarkRetry).not.toHaveBeenCalled();
    });
  });

  describe("T017: worker uses FOR UPDATE SKIP LOCKED", () => {
    it("calls findPendingEligible to claim pending emails", async () => {
      mockFindPendingEligible.mockResolvedValue([]);

      await processQueue(
        createMockRepository(),
        mockResendClient,
        mockTemplateRegistry,
      );

      // FOR UPDATE SKIP LOCKED is implemented in the repository's
      // findPendingEligible method. The worker verifies by calling
      // the repository method with the batch limit and tx handle.
      expect(mockFindPendingEligible).toHaveBeenCalledTimes(1);
      expect(mockFindPendingEligible).toHaveBeenCalledWith(10, expect.any(Object));
    });
  });

  describe("T019: worker wraps processing in a database transaction", () => {
    it("calls db.transaction to ensure FOR UPDATE SKIP LOCKED isolation", async () => {
      mockFindPendingEligible.mockResolvedValue([]);

      // Import the mocked db to check transaction was called
      const { db: mockedDb } = await import("@/infrastructure/db/client");

      await processQueue(
        createMockRepository(),
        mockResendClient,
        mockTemplateRegistry,
      );

      // processQueue wraps all processing in db.transaction so the
      // FOR UPDATE SKIP LOCKED is held until marks are applied
      expect(mockedDb.transaction).toHaveBeenCalledTimes(1);
    });

    it("passes transaction handle to findPendingEligible", async () => {
      mockFindPendingEligible.mockResolvedValue([]);

      await processQueue(
        createMockRepository(),
        mockResendClient,
        mockTemplateRegistry,
      );

      // findPendingEligible receives the tx handle so the lock
      // is held within the same transaction boundary
      expect(mockFindPendingEligible).toHaveBeenCalledWith(10, expect.any(Object));
    });
  });

  describe("T018: worker returns WorkerResult with counts", () => {
    it("returns correct counts for mixed outcomes (sent, failed, retried)", async () => {
      mockFindPendingEligible.mockResolvedValue([
        fakeEmailRow({ id: "row-sent" }), // will succeed
        fakeEmailRow({
          id: "row-retry",
          attempts: 1,
        }), // will fail and retry
        fakeEmailRow({
          id: "row-failed",
          attempts: 4,
        }), // will fail permanently
      ]);

      mockSend
        .mockResolvedValueOnce({ id: "email-1" })
        .mockRejectedValueOnce(new EmailProviderError("Timeout"))
        .mockRejectedValueOnce(new EmailProviderError("Permanent"));

      const result = await processQueue(
        createMockRepository(),
        mockResendClient,
        mockTemplateRegistry,
      );

      expect(result).toEqual<WorkerResult>({
        processed: 3,
        sent: 1,
        failed: 1,
        retried: 1,
      });
    });

    it("returns zero counts when no pending emails", async () => {
      mockFindPendingEligible.mockResolvedValue([]);

      const result = await processQueue(
        createMockRepository(),
        mockResendClient,
        mockTemplateRegistry,
      );

      expect(result).toEqual<WorkerResult>({
        processed: 0,
        sent: 0,
        failed: 0,
        retried: 0,
      });
    });
  });

  describe("Edge case: template not found or render error", () => {
    it("marks FAILED immediately when template does not exist", async () => {
      mockFindPendingEligible.mockResolvedValue([fakeEmailRow()]);
      mockGetTemplate.mockImplementation(() => {
        throw new Error("Template 'lead-assigned-agent' not found");
      });

      const result = await processQueue(
        createMockRepository(),
        mockResendClient,
        mockTemplateRegistry,
      );

      expect(mockMarkFailed).toHaveBeenCalledWith(
        TEST_ROW_ID,
        "Template 'lead-assigned-agent' not found",
        expect.any(Object),
      );
      expect(mockMarkRetry).not.toHaveBeenCalled();
      expect(mockMarkSent).not.toHaveBeenCalled();
      expect(result).toEqual<WorkerResult>({
        processed: 1,
        sent: 0,
        failed: 1,
        retried: 0,
      });
    });
  });
});
