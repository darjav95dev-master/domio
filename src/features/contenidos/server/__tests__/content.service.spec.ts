/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — MUST be defined before vi.mock calls
// ---------------------------------------------------------------------------

const mockRevalidateTag = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidateTag: mockRevalidateTag,
}));

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const TENANT_ID = "tenant-1";
const USER_ID = "user-1";

const heroPayload = {
  claim: "Vive tu hogar ideal",
  lead: "Descubre promociones únicas",
  ctaPrimary: "Ver promociones",
  ctaSecondary: "Saber más",
  backgroundImageId: null,
};

const invalidHeroPayload = {
  claim: "",
  lead: "Short lead",
  ctaPrimary: "Click",
  ctaSecondary: "More",
  backgroundImageId: 123, // wrong type — not null, not uuid
};

const contactPayload = {
  phone: "+34 900 123 456",
  email: "info@domio.es",
  address: "Calle Ejemplo 123",
  hours: "Lun-Vie 9:00-18:00",
  whatsappNumber: "+34 600 123 456",
  whatsappPrefilledMessage: "Hola, me interesa",
};

const invalidEmailPayload = {
  phone: "+34 900 123 456",
  email: "not-an-email",
};

const mockContentBlock = {
  id: "block-1",
  tenantId: TENANT_ID,
  pageKey: "home" as const,
  blockKey: "hero" as const,
  payload: heroPayload,
  updatedBy: USER_ID,
  updatedAt: new Date("2026-07-08T12:00:00Z"),
};

const mockContentHistoryBlock = {
  id: "history-1",
  tenantId: TENANT_ID,
  contentType: "block" as const,
  contentKey: "home:hero",
  payloadSnapshot: heroPayload as Record<string, unknown>,
  updatedBy: USER_ID,
  createdAt: new Date("2026-07-08T12:00:00Z"),
};

const mockContactConfig = {
  tenantId: TENANT_ID,
  phone: "+34 900 123 456",
  email: "info@domio.es",
  address: "Calle Ejemplo 123",
  hours: "Lun-Vie 9:00-18:00",
  whatsappNumber: "+34 600 123 456",
  whatsappPrefilledMessage: "Hola, me interesa",
  updatedBy: USER_ID,
  updatedAt: new Date("2026-07-08T12:00:00Z"),
};

const mockContentHistoryContact = {
  id: "history-2",
  tenantId: TENANT_ID,
  contentType: "contact" as const,
  contentKey: "global",
  payloadSnapshot: contactPayload as Record<string, unknown>,
  updatedBy: USER_ID,
  createdAt: new Date("2026-07-08T12:00:00Z"),
};

// ---------------------------------------------------------------------------
// ContentService
// ---------------------------------------------------------------------------
describe("ContentService", () => {
  let service: import("../content.service").ContentService;
  let mockBlockRepo: {
    upsert: ReturnType<typeof vi.fn>;
  };
  let mockContactRepo: {
    upsert: ReturnType<typeof vi.fn>;
  };
  let mockHistoryRepo: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockBlockRepo = {
      upsert: vi.fn().mockResolvedValue(mockContentBlock),
    };

    mockContactRepo = {
      upsert: vi.fn().mockResolvedValue(mockContactConfig),
    };

    mockHistoryRepo = {
      create: vi.fn().mockResolvedValue(mockContentHistoryBlock),
      findById: vi.fn(),
    };

    const mod = await import("../content.service");
    const ContentService = mod.ContentService;
    // Mock repos are structurally compatible — cast needed because they don't
    // extend the actual repository classes
    service = new ContentService(
      mockBlockRepo as unknown as import("../content-block.repository").ContentBlockRepository,
      mockContactRepo as unknown as import("../contact-config.repository").ContactConfigRepository,
      mockHistoryRepo as unknown as import("../content-history.repository").ContentHistoryRepository,
    );
  });

  // ---------------------------------------------------------------------------
  // saveBlock
  // ---------------------------------------------------------------------------
  describe("saveBlock", () => {
    const HOME = "home" as const;
    const HERO = "hero" as const;

    it("returns error for invalid block key combination", async () => {
      const result = await service.saveBlock(
        TENANT_ID,
        HOME,
        "nonexistent-block" as import("@/shared/types/content.types").BlockKey,
        heroPayload,
        USER_ID,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Combinación page_key+block_key no válida");
      expect(mockBlockRepo.upsert).not.toHaveBeenCalled();
      expect(mockHistoryRepo.create).not.toHaveBeenCalled();
      expect(mockRevalidateTag).not.toHaveBeenCalled();
    });

    it("returns error when payload fails Zod validation", async () => {
      const result = await service.saveBlock(
        TENANT_ID,
        HOME,
        HERO,
        invalidHeroPayload,
        USER_ID,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Payload inválido");
      expect(result).toHaveProperty("details");
      expect(mockBlockRepo.upsert).not.toHaveBeenCalled();
      expect(mockHistoryRepo.create).not.toHaveBeenCalled();
    });

    it("upserts block and creates history entry on success", async () => {
      const result = await service.saveBlock(
        TENANT_ID,
        HOME,
        HERO,
        heroPayload,
        USER_ID,
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockBlockRepo.upsert).toHaveBeenCalledWith(
        TENANT_ID,
        "home",
        "hero",
        heroPayload,
        USER_ID,
      );
      expect(mockHistoryRepo.create).toHaveBeenCalledWith(
        TENANT_ID,
        "block",
        "home:hero",
        heroPayload,
        USER_ID,
      );
    });

    it("calls revalidateTag with the correct tag", async () => {
      await service.saveBlock(
        TENANT_ID,
        HOME,
        HERO,
        heroPayload,
        USER_ID,
      );

      expect(mockRevalidateTag).toHaveBeenCalledWith("content:home");
      expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
    });

    it("returns error when schema is not found for a valid block key", async () => {
      const result = await service.saveBlock(
        TENANT_ID,
        HOME,
        HERO,
        {},
        USER_ID,
      );

      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // saveContactConfig
  // ---------------------------------------------------------------------------
  describe("saveContactConfig", () => {
    it("returns error for invalid email", async () => {
      const result = await service.saveContactConfig(
        TENANT_ID,
        invalidEmailPayload,
        USER_ID,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Payload inválido");
      expect(result).toHaveProperty("details");
      expect(mockContactRepo.upsert).not.toHaveBeenCalled();
      expect(mockHistoryRepo.create).not.toHaveBeenCalled();
    });

    it("upserts contact config and creates history entry on success", async () => {
      mockHistoryRepo.create.mockResolvedValue(mockContentHistoryContact);

      const result = await service.saveContactConfig(
        TENANT_ID,
        contactPayload,
        USER_ID,
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockContactRepo.upsert).toHaveBeenCalledWith(
        TENANT_ID,
        contactPayload,
        USER_ID,
      );
      expect(mockHistoryRepo.create).toHaveBeenCalledWith(
        TENANT_ID,
        "contact",
        "global",
        contactPayload,
        USER_ID,
      );
    });

    it("calls revalidateTag with correct tags", async () => {
      await service.saveContactConfig(
        TENANT_ID,
        contactPayload,
        USER_ID,
      );

      expect(mockRevalidateTag).toHaveBeenCalledWith("contact:global");
      expect(mockRevalidateTag).toHaveBeenCalledWith("layout:public");
      expect(mockRevalidateTag).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // revert
  // ---------------------------------------------------------------------------
  describe("revert", () => {
    it("returns error when historyId does not exist", async () => {
      mockHistoryRepo.findById.mockResolvedValue(null);

      const result = await service.revert(TENANT_ID, "nonexistent-id", USER_ID);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Entrada histórica no encontrada");
      expect(mockBlockRepo.upsert).not.toHaveBeenCalled();
      expect(mockContactRepo.upsert).not.toHaveBeenCalled();
    });

    it("restores content block and creates new history entry", async () => {
      mockHistoryRepo.findById.mockResolvedValue(mockContentHistoryBlock);
      mockBlockRepo.upsert.mockResolvedValue(mockContentBlock);
      mockHistoryRepo.create.mockResolvedValue({
        ...mockContentHistoryBlock,
        id: "history-3",
      });

      const result = await service.revert(TENANT_ID, "history-1", USER_ID);

      expect(result.success).toBe(true);
      expect(mockBlockRepo.upsert).toHaveBeenCalledWith(
        TENANT_ID,
        "home",
        "hero",
        heroPayload,
        USER_ID,
      );
      // The revert also creates a new history entry
      expect(mockHistoryRepo.create).toHaveBeenCalledWith(
        TENANT_ID,
        "block",
        "home:hero",
        heroPayload,
        USER_ID,
      );
      expect(mockRevalidateTag).toHaveBeenCalledWith("content:home");
    });

    it("restores contact config and creates new history entry", async () => {
      const contactHistoryEntry = {
        ...mockContentHistoryContact,
        payloadSnapshot: contactPayload as Record<string, unknown>,
      };
      mockHistoryRepo.findById.mockResolvedValue(contactHistoryEntry);
      mockContactRepo.upsert.mockResolvedValue(mockContactConfig);
      mockHistoryRepo.create.mockResolvedValue({
        ...mockContentHistoryContact,
        id: "history-4",
      });

      const result = await service.revert(TENANT_ID, "history-2", USER_ID);

      expect(result.success).toBe(true);
      expect(mockContactRepo.upsert).toHaveBeenCalledWith(
        TENANT_ID,
        contactPayload,
        USER_ID,
      );
      expect(mockHistoryRepo.create).toHaveBeenCalledWith(
        TENANT_ID,
        "contact",
        "global",
        contactPayload,
        USER_ID,
      );
      expect(mockRevalidateTag).toHaveBeenCalledWith("contact:global");
      expect(mockRevalidateTag).toHaveBeenCalledWith("layout:public");
    });
  });
});
