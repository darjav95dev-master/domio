import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before any imports
// ---------------------------------------------------------------------------
const { mockSession, mockSaveBlock, mockContentServiceInstance } =
  vi.hoisted(() => {
    const saveBlock = vi.fn();

    return {
      mockSession: {
        userId: "user-1",
        tenantId: "tenant-1",
        role: "ADMIN" as const,
        name: "Test Admin",
      },
      mockSaveBlock: saveBlock,
      mockContentServiceInstance: {
        saveBlock,
        saveContactConfig: vi.fn(),
        revert: vi.fn(),
      },
    };
  });

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/features/contenidos/server/content.service", () => ({
  ContentService: vi.fn(() => mockContentServiceInstance),
}));

// ---------------------------------------------------------------------------
// SUT imports
// ---------------------------------------------------------------------------
import { saveContentBlock } from "@/features/contenidos/actions/content-block.actions";
import { getServerSession } from "@/infrastructure/auth/session";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const PAGE_KEY = "home";
const BLOCK_KEY = "hero";
const PAYLOAD = {
  claim: "Arquitectura que inspira",
  lead: "Comercialización inmobiliaria con enfoque editorial",
  ctaPrimary: "Ver portafolio",
  ctaSecondary: "Contactar",
  backgroundImageId: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("saveContentBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveBlock.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const result = await saveContentBlock(PAGE_KEY, BLOCK_KEY, PAYLOAD);

    expect(result.success).toBe(false);
    expect(result.error).toBe("No autorizado");
    expect(mockSaveBlock).not.toHaveBeenCalled();
  });

  it("rejects AGENT role", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      ...mockSession,
      role: "AGENT",
    });

    const result = await saveContentBlock(PAGE_KEY, BLOCK_KEY, PAYLOAD);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "No tienes permiso para realizar esta acción",
    );
    expect(mockSaveBlock).not.toHaveBeenCalled();
  });

  it("accepts ADMIN role and calls ContentService.saveBlock with correct params", async () => {
    mockSaveBlock.mockResolvedValue({ success: true });

    const result = await saveContentBlock(PAGE_KEY, BLOCK_KEY, PAYLOAD);

    expect(result.success).toBe(true);
    expect(mockSaveBlock).toHaveBeenCalledTimes(1);
    expect(mockSaveBlock).toHaveBeenCalledWith(
      mockSession.tenantId,
      PAGE_KEY,
      BLOCK_KEY,
      PAYLOAD,
      mockSession.userId,
    );
  });

  it("accepts OPERATOR role and calls ContentService.saveBlock with correct params", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      ...mockSession,
      role: "OPERATOR",
    });
    mockSaveBlock.mockResolvedValue({ success: true });

    const result = await saveContentBlock(PAGE_KEY, BLOCK_KEY, PAYLOAD);

    expect(result.success).toBe(true);
    expect(mockSaveBlock).toHaveBeenCalledTimes(1);
  });

  it("propagates service errors back to caller", async () => {
    mockSaveBlock.mockResolvedValue({
      success: false,
      error: "Payload inválido",
      details: [{ message: "El claim es obligatorio" }],
    });

    const result = await saveContentBlock(PAGE_KEY, BLOCK_KEY, PAYLOAD);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Payload inválido");
    expect(result.details).toBeDefined();
  });
});
