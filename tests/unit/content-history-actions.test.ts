import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before any imports
// ---------------------------------------------------------------------------
const { mockSession, mockFindByContent, mockRevert, mockContentServiceInstance } =
  vi.hoisted(() => {
    const findByContent = vi.fn();
    const revert = vi.fn();

    return {
      mockSession: {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "ADMIN" as const,
        name: "Test Admin",
      },
      mockFindByContent: findByContent,
      mockRevert: revert,
      mockContentServiceInstance: {
        saveBlock: vi.fn(),
        saveContactConfig: vi.fn(),
        revert,
      },
    };
  });

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/features/contenidos/server/content.service", () => ({
  ContentService: vi.fn(() => mockContentServiceInstance),
}));

vi.mock("@/features/contenidos/server/content-history.repository", () => ({
  ContentHistoryRepository: vi.fn(),
}));

// ---------------------------------------------------------------------------
// SUT imports
// ---------------------------------------------------------------------------
import { getContentHistory, revertContent } from "@/features/contenidos/actions/content-history.actions";
import { getServerSession } from "@/infrastructure/auth/session";
import { ContentHistoryRepository } from "@/features/contenidos/server/content-history.repository";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const CONTENT_TYPE = "block";
const CONTENT_KEY = "home:hero";
const HISTORY_ID = "history-1";

const mockHistoryEntries = [
  {
    id: "history-2",
    tenantId: "tenant-1",
    contentType: "block",
    contentKey: "home:hero",
    payloadSnapshot: { claim: "Updated claim" },
    updatedBy: "user-2",
    createdAt: new Date("2026-07-08T12:00:00Z"),
  },
  {
    id: HISTORY_ID,
    tenantId: "tenant-1",
    contentType: "block",
    contentKey: "home:hero",
    payloadSnapshot: { claim: "Original claim" },
    updatedBy: "user-1",
    createdAt: new Date("2026-07-08T10:00:00Z"),
  },
];

// ---------------------------------------------------------------------------
// Tests — getContentHistory
// ---------------------------------------------------------------------------

describe("getContentHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindByContent.mockReset();
    mockRevert.mockReset();
    // Restore default session mock
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const result = await getContentHistory(CONTENT_TYPE, CONTENT_KEY);

    expect(result.success).toBe(false);
    expect(result.error).toBe("No autorizado");
    expect(mockFindByContent).not.toHaveBeenCalled();
  });

  it("rejects AGENT role", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      ...mockSession,
      role: "AGENT",
    });

    const result = await getContentHistory(CONTENT_TYPE, CONTENT_KEY);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "No tienes permiso para realizar esta acción",
    );
    expect(mockFindByContent).not.toHaveBeenCalled();
  });

  it("returns list of history entries for ADMIN", async () => {
    mockFindByContent.mockResolvedValue(mockHistoryEntries);
    vi.mocked(ContentHistoryRepository).mockImplementation(
      () =>
        ({
          findByContent: mockFindByContent,
        }) as unknown as InstanceType<typeof ContentHistoryRepository>,
    );

    const result = await getContentHistory(CONTENT_TYPE, CONTENT_KEY);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockHistoryEntries);
    expect(result.data).toHaveLength(2);
    expect(mockFindByContent).toHaveBeenCalledWith(
      mockSession.tenantId,
      CONTENT_TYPE,
      CONTENT_KEY,
      undefined,
    );
  });

  it("returns list of history entries for OPERATOR", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      ...mockSession,
      role: "OPERATOR",
    });
    mockFindByContent.mockResolvedValue(mockHistoryEntries);
    vi.mocked(ContentHistoryRepository).mockImplementation(
      () =>
        ({
          findByContent: mockFindByContent,
        }) as unknown as InstanceType<typeof ContentHistoryRepository>,
    );

    const result = await getContentHistory(CONTENT_TYPE, CONTENT_KEY, 10);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(mockFindByContent).toHaveBeenCalledWith(
      mockSession.tenantId,
      CONTENT_TYPE,
      CONTENT_KEY,
      10,
    );
  });
});

// ---------------------------------------------------------------------------
// Tests — revertContent
// ---------------------------------------------------------------------------

describe("revertContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindByContent.mockReset();
    mockRevert.mockReset();
    // Restore default session mock
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const result = await revertContent(HISTORY_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("No autorizado");
    expect(mockRevert).not.toHaveBeenCalled();
  });

  it("rejects AGENT role", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      ...mockSession,
      role: "AGENT",
    });

    const result = await revertContent(HISTORY_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "No tienes permiso para realizar esta acción",
    );
    expect(mockRevert).not.toHaveBeenCalled();
  });

  it("calls ContentService.revert with correct params for ADMIN", async () => {
    mockRevert.mockResolvedValue({ success: true });

    const result = await revertContent(HISTORY_ID);

    expect(result.success).toBe(true);
    expect(mockRevert).toHaveBeenCalledTimes(1);
    expect(mockRevert).toHaveBeenCalledWith(
      mockSession.tenantId,
      HISTORY_ID,
      mockSession.userId,
    );
  });

  it("calls ContentService.revert with correct params for OPERATOR", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      ...mockSession,
      role: "OPERATOR",
    });
    mockRevert.mockResolvedValue({ success: true });

    const result = await revertContent(HISTORY_ID);

    expect(result.success).toBe(true);
    expect(mockRevert).toHaveBeenCalledTimes(1);
  });

  it("returns error when historyId does not exist", async () => {
    mockRevert.mockResolvedValue({
      success: false,
      error: "Entrada histórica no encontrada",
    });

    const result = await revertContent("non-existent-id");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Entrada histórica no encontrada");
  });

  it("propagates service errors to caller", async () => {
    mockRevert.mockResolvedValue({
      success: false,
      error: "Error al revertir el contenido",
    });

    const result = await revertContent(HISTORY_ID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Error al revertir el contenido");
  });
});
