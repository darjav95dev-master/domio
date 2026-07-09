/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockWithTransaction = vi.fn();

const mockApiKeyContext = {
  type: "apikey" as const,
  apiKeyId: "key-001",
  getTenantId: () => "tenant-1",
  withTransaction: mockWithTransaction,
  resolveFilters: () => ({ kind: "portfolio" as const, status: "PUBLISHED" as const }),
};

vi.mock("@/infrastructure/tenant/ApiKeyContext", () => ({
  ApiKeyContext: vi.fn().mockImplementation(() => mockApiKeyContext),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_PAYLOAD = {
  name: "Juan Pérez",
  email: "juan@example.com",
  phone: "+34600000000",
  message: "Estoy interesado en esta propiedad",
  promocionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  consent: {
    legalBasis: "RGPD: consentimiento informado",
    textAccepted: "He leído y acepto la política de privacidad",
  },
};

const LEAD_RESULT = { id: "lead-123", tenantId: "tenant-1", promocionId: "promo-1", source: "institutional", name: "Juan Pérez" };
const CONSENT_RESULT = { id: "consent-456", leadId: "lead-123" };
const EMAIL_RESULT = { id: "email-789" };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("createInstitutionalLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate payload and create lead in transaction", async () => {
    const { createInstitutionalLead } = await import("../create-institutional-lead");

    const mockTx = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    };

    mockWithTransaction.mockImplementation(
      async <T>(fn: (tx: typeof mockTx) => Promise<T>): Promise<T> => fn(mockTx),
    );

    mockTx.returning
      .mockResolvedValueOnce([LEAD_RESULT])
      .mockResolvedValueOnce([CONSENT_RESULT])
      .mockResolvedValueOnce([EMAIL_RESULT]);

    const result = await createInstitutionalLead({
      ctx: mockApiKeyContext as never,
      payload: VALID_PAYLOAD,
    });

    expect(result).toHaveProperty("leadId", "lead-123");
    expect(result).toHaveProperty("consentId", "consent-456");
    expect(result).toHaveProperty("emailQueueId", "email-789");
  });

  it("should throw on invalid payload (empty name, bad email, non-UUID)", async () => {
    const { createInstitutionalLead } = await import("../create-institutional-lead");

    const invalidPayload = { name: "", email: "not-an-email", promocionId: "not-a-uuid", consent: { legalBasis: "", textAccepted: "" } };

    await expect(
      createInstitutionalLead({
        ctx: mockApiKeyContext as never,
        payload: invalidPayload,
      }),
    ).rejects.toThrow();
  });

  it("should throw when consent is missing", async () => {
    const { createInstitutionalLead } = await import("../create-institutional-lead");

    const payload = { name: "Juan", email: "juan@example.com", promocionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" } as never;

    await expect(
      createInstitutionalLead({
        ctx: mockApiKeyContext as never,
        payload,
      }),
    ).rejects.toThrow();
  });

  it("should enqueue email notification in same transaction", async () => {
    const { createInstitutionalLead } = await import("../create-institutional-lead");

    const mockTx = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    };

    mockWithTransaction.mockImplementation(
      async <T>(fn: (tx: typeof mockTx) => Promise<T>): Promise<T> => fn(mockTx),
    );

    mockTx.returning
      .mockResolvedValueOnce([LEAD_RESULT])
      .mockResolvedValueOnce([CONSENT_RESULT])
      .mockResolvedValueOnce([EMAIL_RESULT]);

    await createInstitutionalLead({
      ctx: mockApiKeyContext as never,
      payload: VALID_PAYLOAD,
    });

    // The tx.insert should be called 3 times: lead, consent_record, email_queue
    expect(mockTx.insert).toHaveBeenCalledTimes(3);
  });

  it("should throw if lead creation fails", async () => {
    const { createInstitutionalLead } = await import("../create-institutional-lead");

    const mockTx = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    };

    mockWithTransaction.mockImplementation(
      async <T>(fn: (tx: typeof mockTx) => Promise<T>): Promise<T> => fn(mockTx),
    );

    mockTx.returning.mockResolvedValueOnce([]);

    await expect(
      createInstitutionalLead({
        ctx: mockApiKeyContext as never,
        payload: VALID_PAYLOAD,
      }),
    ).rejects.toThrow("Failed to create lead");
  });

  it("should reject payload without promocionId", async () => {
    const { createInstitutionalLead } = await import("../create-institutional-lead");

    const payload = { name: "Juan", email: "juan@example.com", consent: { legalBasis: "RGPD", textAccepted: "Accepted" } } as never;

    await expect(
      createInstitutionalLead({
        ctx: mockApiKeyContext as never,
        payload,
      }),
    ).rejects.toThrow();
  });
});
