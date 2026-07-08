/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — MUST be defined before vi.mock calls
// ---------------------------------------------------------------------------

const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockRevalidateTag = vi.hoisted(() => vi.fn());

const mockBlockRepoUpsert = vi.hoisted(() => vi.fn());
const mockContactRepoUpsert = vi.hoisted(() => vi.fn());
const mockHistoryRepoCreate = vi.hoisted(() => vi.fn());

// Mock next/cache to avoid "static generation store missing" invariant
vi.mock("next/cache", () => ({
  revalidateTag: mockRevalidateTag,
}));

// Mock all three repositories so the real ContentService can work
// with mocked dependencies (avoids DB calls)
vi.mock("../../server/content-block.repository", () => ({
  ContentBlockRepository: vi.fn(() => ({
    upsert: mockBlockRepoUpsert,
    findByTenantAndPage: vi.fn(),
    findByTenantPageAndBlock: vi.fn(),
  })),
}));

vi.mock("../../server/contact-config.repository", () => ({
  ContactConfigRepository: vi.fn(() => ({
    upsert: mockContactRepoUpsert,
    findByTenant: vi.fn(),
  })),
}));

vi.mock("../../server/content-history.repository", () => ({
  ContentHistoryRepository: vi.fn(() => ({
    create: mockHistoryRepoCreate,
    findByContent: vi.fn(),
    findById: vi.fn(),
  })),
}));

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: mockGetServerSession,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const adminSession = {
  userId: "admin-1",
  tenantId: "tenant-1",
  role: "ADMIN" as const,
  name: "Admin",
};

const operatorSession = {
  userId: "op-1",
  tenantId: "tenant-1",
  role: "OPERATOR" as const,
  name: "Operator",
};

const agentSession = {
  userId: "agent-1",
  tenantId: "tenant-1",
  role: "AGENT" as const,
  name: "Agent",
};

const validData = {
  phone: "+34 900 123 456",
  email: "info@domio.es",
  address: "Calle Ejemplo 123",
  hours: "Lun-Vie 9:00-18:00",
  whatsappNumber: "+34 600 123 456",
  whatsappPrefilledMessage: "Hola, me interesa una propiedad",
};

// ---------------------------------------------------------------------------
// SaveContactConfig action
// ---------------------------------------------------------------------------
describe("saveContactConfig action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { saveContactConfig } = await import("../contact-config.actions");

    const result = await saveContactConfig(validData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("No autorizado");
    expect(mockContactRepoUpsert).not.toHaveBeenCalled();
    expect(mockHistoryRepoCreate).not.toHaveBeenCalled();
  });

  it("rejects AGENT role", async () => {
    mockGetServerSession.mockResolvedValue(agentSession);

    const { saveContactConfig } = await import("../contact-config.actions");

    const result = await saveContactConfig(validData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("No tienes permiso para realizar esta acción");
    expect(mockContactRepoUpsert).not.toHaveBeenCalled();
    expect(mockHistoryRepoCreate).not.toHaveBeenCalled();
  });

  it("accepts ADMIN role and calls service with correct parameters", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockContactRepoUpsert.mockResolvedValue({
      tenantId: "tenant-1",
      phone: "+34 900 123 456",
      email: "info@domio.es",
      address: "Calle Ejemplo 123",
      hours: "Lun-Vie 9:00-18:00",
      whatsappNumber: "+34 600 123 456",
      whatsappPrefilledMessage: "Hola, me interesa una propiedad",
      updatedBy: "admin-1",
      updatedAt: new Date(),
    });
    mockHistoryRepoCreate.mockResolvedValue({
      id: "history-1",
      tenantId: "tenant-1",
      contentType: "contact",
      contentKey: "global",
      payloadSnapshot: validData,
      updatedBy: "admin-1",
      createdAt: new Date(),
    });

    const { saveContactConfig } = await import("../contact-config.actions");

    const result = await saveContactConfig(validData);

    expect(result.success).toBe(true);
    expect(mockContactRepoUpsert).toHaveBeenCalledWith(
      adminSession.tenantId,
      validData,
      adminSession.userId,
    );
    expect(mockHistoryRepoCreate).toHaveBeenCalledWith(
      adminSession.tenantId,
      "contact",
      "global",
      validData,
      adminSession.userId,
    );
    expect(mockRevalidateTag).toHaveBeenCalledWith("contact:global");
    expect(mockRevalidateTag).toHaveBeenCalledWith("layout:public");
  });

  it("accepts OPERATOR role and calls service with correct parameters", async () => {
    mockGetServerSession.mockResolvedValue(operatorSession);
    mockContactRepoUpsert.mockResolvedValue({
      tenantId: "tenant-1",
      phone: "+34 900 123 456",
      email: "info@domio.es",
      address: "Calle Ejemplo 123",
      hours: "Lun-Vie 9:00-18:00",
      whatsappNumber: "+34 600 123 456",
      whatsappPrefilledMessage: "Hola, me interesa una propiedad",
      updatedBy: "op-1",
      updatedAt: new Date(),
    });
    mockHistoryRepoCreate.mockResolvedValue({
      id: "history-1",
      tenantId: "tenant-1",
      contentType: "contact",
      contentKey: "global",
      payloadSnapshot: validData,
      updatedBy: "op-1",
      createdAt: new Date(),
    });

    const { saveContactConfig } = await import("../contact-config.actions");

    const result = await saveContactConfig(validData);

    expect(result.success).toBe(true);
    expect(mockContactRepoUpsert).toHaveBeenCalledWith(
      operatorSession.tenantId,
      validData,
      operatorSession.userId,
    );
  });

  it("rejects invalid email via service validation", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);

    const { saveContactConfig } = await import("../contact-config.actions");

    const invalidData = { ...validData, email: "not-an-email" };
    const result = await saveContactConfig(invalidData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Payload inválido");
    expect(result.details).toBeDefined();
    expect(mockContactRepoUpsert).not.toHaveBeenCalled();
    expect(mockHistoryRepoCreate).not.toHaveBeenCalled();
  });

  it("returns the full result object from the service on success", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockContactRepoUpsert.mockResolvedValue({
      tenantId: "tenant-1",
      phone: "+34 900 123 456",
      email: "info@domio.es",
      address: "Calle Ejemplo 123",
      hours: "Lun-Vie 9:00-18:00",
      whatsappNumber: "+34 600 123 456",
      whatsappPrefilledMessage: "Hola, me interesa una propiedad",
      updatedBy: "admin-1",
      updatedAt: new Date(),
    });
    mockHistoryRepoCreate.mockResolvedValue({
      id: "history-1",
      tenantId: "tenant-1",
      contentType: "contact",
      contentKey: "global",
      payloadSnapshot: validData,
      updatedBy: "admin-1",
      createdAt: new Date(),
    });

    const { saveContactConfig } = await import("../contact-config.actions");

    const result = await saveContactConfig(validData);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns error when service token expires or DB error occurs", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    // The action itself doesn't catch errors — but the ContentService's
    // saveContactConfig will throw if upsert rejects. The test verifies
    // that the action propagates errors as rejected promises.
    mockContactRepoUpsert.mockRejectedValue(new Error("DB error"));

    const { saveContactConfig } = await import("../contact-config.actions");

    await expect(saveContactConfig(validData)).rejects.toThrow("DB error");
  });
});
