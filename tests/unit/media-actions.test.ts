/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MediaAsset } from "@/infrastructure/db/schema/media-assets";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before any imports
// ---------------------------------------------------------------------------
const { mockSession, mockMediaServiceInstance } = vi.hoisted(() => {
  const session = {
    userId: "00000000-0000-0000-0000-000000000010",
    tenantId: "00000000-0000-0000-0000-000000000001",
    role: "ADMIN" as const,
    name: "Test Admin",
  };

  const instance = {
    uploadImage: vi.fn(),
    signedReadUrl: vi.fn(),
    reorderGallery: vi.fn(),
    setCover: vi.fn(),
    delete: vi.fn(),
    getPublicUrl: vi.fn((r2Key: string) => `https://cdn.example.com/${r2Key}`),
  };

  return { mockSession: session, mockMediaServiceInstance: instance };
});

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/infrastructure/media/media.service", () => ({
  MediaService: vi.fn(() => mockMediaServiceInstance),
}));

// Mock DB for validateMediaForPublish
vi.mock("@/infrastructure/db/client", () => ({
  db: {
    transaction: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// SUT imports
// ---------------------------------------------------------------------------
import {
  uploadMediaAction,
  deleteMediaAction,
  reorderMediaAction,
  setCoverAction,
  validateMediaForPublish,
} from "@/features/promociones/actions/media.actions";
import { getServerSession } from "@/infrastructure/auth/session";
import { db } from "@/infrastructure/db/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PROMOCION_ID = "550e8400-e29b-41d4-a716-446655440000";
const ASSET_ID_1 = "660e8400-e29b-41d4-a716-446655440001";
const ASSET_ID_2 = "660e8400-e29b-41d4-a716-446655440002";

function fakeAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: ASSET_ID_1,
    tenantId: mockSession.tenantId,
    ownerType: "PROMOCION",
    ownerId: PROMOCION_ID,
    kind: "IMAGE_GALLERY",
    r2Key: "abc-123.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    altText: "Vista frontal",
    sortOrder: 0,
    isCover: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function createMockFile(): File {
  return new File(["fake image content"], "photo.jpg", { type: "image/jpeg" });
}

function createTx(assets: MediaAsset[] = []) {
  const selectWhere = vi.fn().mockResolvedValue(assets);
  const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
  const select = vi.fn().mockReturnValue({ from: selectFrom });
  return {
    select,
    execute: vi.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("uploadMediaAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a media asset successfully", async () => {
    const asset = fakeAsset();
    mockMediaServiceInstance.uploadImage.mockResolvedValue(asset);

    const result = await uploadMediaAction(
      PROMOCION_ID,
      "IMAGE_GALLERY",
      createMockFile(),
      "Vista frontal",
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.asset?.id).toBe(ASSET_ID_1);
      expect(result.asset?.altText).toBe("Vista frontal");
      expect(result.asset?.kind).toBe("IMAGE_GALLERY");
    }
    expect(mockMediaServiceInstance.uploadImage).toHaveBeenCalledTimes(1);
  });

  it("rejects empty altText with validation error", async () => {
    const result = await uploadMediaAction(
      PROMOCION_ID,
      "IMAGE_GALLERY",
      createMockFile(),
      "",
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Datos inválidos");
      expect(result.issues).toBeDefined();
      expect(result.issues!.length).toBeGreaterThan(0);
    }
    expect(mockMediaServiceInstance.uploadImage).not.toHaveBeenCalled();
  });

  it("rejects invalid kind with validation error", async () => {
    const result = await uploadMediaAction(
      PROMOCION_ID,
      "INVALID" as "IMAGE_GALLERY",
      createMockFile(),
      "Vista frontal",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Datos inválidos");
    expect(mockMediaServiceInstance.uploadImage).not.toHaveBeenCalled();
  });

  it("returns unauthorized when no session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const result = await uploadMediaAction(
      PROMOCION_ID,
      "IMAGE_GALLERY",
      createMockFile(),
      "Vista frontal",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("No autorizado");
  });

  it("returns error when MediaService throws", async () => {
    mockMediaServiceInstance.uploadImage.mockRejectedValue(
      new Error("R2 upload failed"),
    );

    const result = await uploadMediaAction(
      PROMOCION_ID,
      "IMAGE_GALLERY",
      createMockFile(),
      "Vista frontal",
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("R2 upload failed");
  });
});

describe("deleteMediaAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Helper: sets up db.transaction to simulate the ownership check. */
  function mockOwnershipCheck(assets: MediaAsset[] = [fakeAsset()]) {
    const tx = createTx(assets);
    (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback) => callback(tx),
    );
  }

  it("deletes a media asset successfully", async () => {
    mockOwnershipCheck();
    mockMediaServiceInstance.delete.mockResolvedValue(undefined);

    const result = await deleteMediaAction(PROMOCION_ID, ASSET_ID_1);

    expect(result.success).toBe(true);
    expect(mockMediaServiceInstance.delete).toHaveBeenCalledWith(ASSET_ID_1);
  });

  it("rejects when asset does not belong to the promotion", async () => {
    mockOwnershipCheck([]); // empty — no asset matches id + ownerId

    const result = await deleteMediaAction(PROMOCION_ID, ASSET_ID_1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("El asset no pertenece a esta promoción");
    expect(mockMediaServiceInstance.delete).not.toHaveBeenCalled();
  });

  it("rejects non-UUID assetId with validation error", async () => {
    const result = await deleteMediaAction(PROMOCION_ID, "not-a-uuid");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Datos inválidos");
    expect(mockMediaServiceInstance.delete).not.toHaveBeenCalled();
  });

  it("returns unauthorized when no session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const result = await deleteMediaAction(PROMOCION_ID, ASSET_ID_1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("No autorizado");
  });

  it("returns error when MediaService throws", async () => {
    mockOwnershipCheck();
    mockMediaServiceInstance.delete.mockRejectedValue(
      new Error("Asset not found"),
    );

    const result = await deleteMediaAction(PROMOCION_ID, ASSET_ID_1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Asset not found");
  });
});

describe("reorderMediaAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reorders media assets successfully", async () => {
    mockMediaServiceInstance.reorderGallery.mockResolvedValue(undefined);

    const result = await reorderMediaAction(PROMOCION_ID, "IMAGE_GALLERY", [
      ASSET_ID_1,
      ASSET_ID_2,
    ]);

    expect(result.success).toBe(true);
    expect(mockMediaServiceInstance.reorderGallery).toHaveBeenCalledWith(
      PROMOCION_ID,
      [ASSET_ID_1, ASSET_ID_2],
    );
  });

  it("rejects empty orderedAssetIds array", async () => {
    const result = await reorderMediaAction(PROMOCION_ID, "IMAGE_GALLERY", []);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Datos inválidos");
    expect(mockMediaServiceInstance.reorderGallery).not.toHaveBeenCalled();
  });

  it("returns unauthorized when no session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const result = await reorderMediaAction(PROMOCION_ID, "IMAGE_GALLERY", [
      ASSET_ID_1,
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toBe("No autorizado");
  });

  it("returns error when MediaService throws", async () => {
    mockMediaServiceInstance.reorderGallery.mockRejectedValue(
      new Error("One or more asset IDs do not belong to the owner"),
    );

    const result = await reorderMediaAction(PROMOCION_ID, "IMAGE_GALLERY", [
      ASSET_ID_1,
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "One or more asset IDs do not belong to the owner",
    );
  });
});

describe("setCoverAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets cover successfully", async () => {
    mockMediaServiceInstance.setCover.mockResolvedValue(undefined);

    const result = await setCoverAction(PROMOCION_ID, ASSET_ID_1);

    expect(result.success).toBe(true);
    expect(mockMediaServiceInstance.setCover).toHaveBeenCalledWith(
      PROMOCION_ID,
      ASSET_ID_1,
    );
  });

  it("returns unauthorized when no session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const result = await setCoverAction(PROMOCION_ID, ASSET_ID_1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("No autorizado");
  });

  it("returns error when MediaService throws", async () => {
    mockMediaServiceInstance.setCover.mockRejectedValue(
      new Error("Asset not found for the specified owner"),
    );

    const result = await setCoverAction(PROMOCION_ID, ASSET_ID_1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Asset not found for the specified owner");
  });
});

describe("validateMediaForPublish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns valid=true when promotion has gallery images with altText and plans with altText", async () => {
    const tx = createTx([
      fakeAsset({ id: ASSET_ID_1, kind: "IMAGE_GALLERY", altText: "Foto 1" }),
      fakeAsset({ id: ASSET_ID_2, kind: "IMAGE_GALLERY", altText: "Foto 2" }),
      fakeAsset({
        id: "770e8400-e29b-41d4-a716-446655440003",
        kind: "PLAN",
        altText: "Plano 1",
      }),
    ]);
    (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: ReturnType<typeof createTx>) => unknown) =>
        callback(tx),
    );

    const result = await validateMediaForPublish(PROMOCION_ID);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid=false when promotion has no gallery images", async () => {
    const tx = createTx([
      fakeAsset({
        id: "770e8400-e29b-41d4-a716-446655440003",
        kind: "PLAN",
        altText: "Plano 1",
      }),
    ]);
    (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: ReturnType<typeof createTx>) => unknown) =>
        callback(tx),
    );

    const result = await validateMediaForPublish(PROMOCION_ID);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Debe subir al menos una imagen de galería",
    );
  });

  it("returns valid=false when a gallery image has empty altText", async () => {
    const tx = createTx([
      fakeAsset({ id: ASSET_ID_1, kind: "IMAGE_GALLERY", altText: "" }),
    ]);
    (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: ReturnType<typeof createTx>) => unknown) =>
        callback(tx),
    );

    const result = await validateMediaForPublish(PROMOCION_ID);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Todas las imágenes deben tener texto alternativo",
    );
  });

  it("returns valid=false when a plan has empty altText", async () => {
    const tx = createTx([
      fakeAsset({ id: ASSET_ID_1, kind: "IMAGE_GALLERY", altText: "OK" }),
      fakeAsset({
        id: "770e8400-e29b-41d4-a716-446655440003",
        kind: "PLAN",
        altText: "",
      }),
    ]);
    (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: ReturnType<typeof createTx>) => unknown) =>
        callback(tx),
    );

    const result = await validateMediaForPublish(PROMOCION_ID);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Todos los planos deben tener texto alternativo",
    );
  });

  it("returns valid=false when both missing images and empty altText exist (multiple errors)", async () => {
    const tx = createTx([
      fakeAsset({ id: ASSET_ID_1, kind: "PLAN", altText: "" }),
    ]);
    (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (callback: (tx: ReturnType<typeof createTx>) => unknown) =>
        callback(tx),
    );

    const result = await validateMediaForPublish(PROMOCION_ID);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("returns unauthorized when no session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const result = await validateMediaForPublish(PROMOCION_ID);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("No autorizado");
  });
});
