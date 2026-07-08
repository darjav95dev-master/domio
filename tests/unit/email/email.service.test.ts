import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { EmailService } from "@/infrastructure/email/email.service";
import {
  ValidationError,
  TemplateNotFoundError,
} from "@/infrastructure/email/types";
import { EMAIL_TEMPLATE_NAMES } from "@/shared/constants/email-templates";
import type { EmailQueue } from "@/infrastructure/db/schema/email-queue";
import type { EmailRepository } from "@/infrastructure/email/email.repository";

// ─── Constants ────────────────────────────────────────────────────────

const BACKOFFICE_URL = "https://panel.domio.com/leads/1";

// ─── Mocks ────────────────────────────────────────────────────────────

const mockInsert: Mock = vi.fn();
function createMockRepository(): Pick<EmailRepository, "insert"> {
  return { insert: mockInsert };
}

// Helper to create a fake returned email queue row
function fakeEmailRow(overrides: Partial<EmailQueue> = {}): EmailQueue {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    toEmail: "test@example.com",
    template: EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT,
    payload: { agentName: "Ana", leadName: "Carlos", promotionName: "Marina", backofficeUrl: BACKOFFICE_URL },
    status: "PENDING",
    attempts: 0,
    nextAttemptAt: new Date("2026-07-08T12:00:00Z"),
    lastError: null,
    createdAt: new Date("2026-07-08T12:00:00Z"),
    sentAt: null,
    ...overrides,
  };
}

const validInput = {
  toEmail: "agent@domio.com",
  template: EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT,
  payload: {
    agentName: "Ana García",
    leadName: "Carlos López",
    promotionName: "Residencial Marina",
    backofficeUrl: BACKOFFICE_URL,
  },
};

const mockTransaction: Record<string, never> = {};

// ─── Tests ────────────────────────────────────────────────────────────

describe("EmailService", () => {
  let service: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmailService(createMockRepository() as unknown as EmailRepository);
  });

  describe("T007: enqueue creates PENDING row in email_queue", () => {
    it("inserts a row with status PENDING, attempts 0, and next_attempt_at set", async () => {
      mockInsert.mockResolvedValue(fakeEmailRow());

      await service.enqueue(validInput);

      expect(mockInsert).toHaveBeenCalledTimes(1);
      const insertArg = mockInsert.mock.calls[0]![0] as Record<string, unknown>;

      expect(insertArg.toEmail).toBe("agent@domio.com");
      expect(insertArg.template).toBe(EMAIL_TEMPLATE_NAMES.LEAD_ASSIGNED_AGENT);
      expect(insertArg.status).toBe("PENDING");
      expect(insertArg.attempts).toBe(0);
      expect(insertArg.nextAttemptAt).toBeInstanceOf(Date);
    });
  });

  describe("T008: enqueue works within existing transaction", () => {
    it("passes the transaction handle to the repository insert", async () => {
      mockInsert.mockResolvedValue(fakeEmailRow());

      await service.enqueue(validInput, mockTransaction);

      expect(mockInsert).toHaveBeenCalledTimes(1);
      // Second argument to repository.insert should be the transaction handle
      const txArg = mockInsert.mock.calls[0]![1];
      expect(txArg).toBe(mockTransaction);
    });
  });

  describe("T009: enqueue validates email format", () => {
    it("throws ValidationError for invalid email", async () => {
      await expect(
        service.enqueue({ ...validInput, toEmail: "not-an-email" }),
      ).rejects.toThrow(ValidationError);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("throws ValidationError for empty email", async () => {
      await expect(
        service.enqueue({ ...validInput, toEmail: "" }),
      ).rejects.toThrow(ValidationError);

      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe("T010: enqueue validates payload against template schema", () => {
    it("throws ValidationError for missing required field", async () => {
      const incompletePayload = {
        ...validInput.payload,
        // omit leadName via delete
      };
      delete (incompletePayload as Record<string, unknown>).leadName;

      await expect(
        service.enqueue({ ...validInput, payload: incompletePayload }),
      ).rejects.toThrow(ValidationError);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("throws ValidationError for invalid field type", async () => {
      const invalidPayload = {
        ...validInput.payload,
        backofficeUrl: "not-a-url",
      };

      await expect(
        service.enqueue({ ...validInput, payload: invalidPayload }),
      ).rejects.toThrow(ValidationError);

      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe("T011: enqueue rejects unknown template", () => {
    it("throws TemplateNotFoundError for unregistered template", async () => {
      await expect(
        service.enqueue({
          ...validInput,
          template: "non-existent-template",
        }),
      ).rejects.toThrow(TemplateNotFoundError);

      expect(mockInsert).not.toHaveBeenCalled();
    });
  });
});
