import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/infrastructure/db/client";
import { type MediaAsset, mediaAssets } from "@/infrastructure/db/schema/media-assets";
import { MediaService } from "@/infrastructure/media/media.service";
import type { UploadInput } from "@/infrastructure/media/types";

const { sendMock, getSignedUrlMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  getSignedUrlMock: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({ send: sendMock })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

vi.mock("@/infrastructure/media/r2-client", () => ({
  r2Client: { send: sendMock },
}));

vi.mock("@/infrastructure/db/client", () => ({
  db: {
    transaction: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  },
}));

const tenantId = "00000000-0000-0000-0000-000000000002";
const ownerId = "00000000-0000-0000-0000-000000000001";

function makeInput(overrides: Partial<UploadInput> = {}): UploadInput {
  return {
    file: Buffer.from("valid image bytes"),
    fileName: "photo.jpg",
    mimeType: "image/jpeg",
    altText: "A valid alt text",
    kind: "IMAGE_GALLERY",
    ownerId,
    ...overrides,
  };
}

function fakeAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    tenantId,
    ownerType: "promotion",
    ownerId,
    kind: "IMAGE_GALLERY",
    r2Key: "22222222-2222-2222-2222-222222222222.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 18,
    altText: "A valid alt text",
    sortOrder: 0,
    isCover: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function createTx(asset: MediaAsset = fakeAsset()) {
  const returning = vi.fn().mockResolvedValue([asset]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });

  // select chain: select().from(table).where(conditions) → Promise<MediaAsset[]>
  const selectWhere = vi.fn().mockResolvedValue([asset]);
  const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
  const select = vi.fn().mockReturnValue({ from: selectFrom });

  // delete chain: tx.delete(table).where(conditions) → Promise<void>
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn().mockReturnValue({ where: deleteWhere });

  // update chain: tx.update(table).set(values).where(conditions) → Promise<void>
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const update = vi.fn().mockReturnValue({ set: updateSet });

  return {
    insert,
    update,
    delete: del,
    select,
    execute: vi.fn().mockResolvedValue(undefined),
  };
}

describe("MediaService", () => {
  let tx: ReturnType<typeof createTx>;

  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({});
    tx = createTx();
    (db.transaction as Mock).mockImplementation(async (callback) =>
      callback(tx),
    );
  });

  describe("uploadImage", () => {
    it("creates a media asset record for a valid upload", async () => {
      const asset = fakeAsset();
      tx = createTx(asset);
      const input = makeInput();

      await expect(
        new MediaService(tenantId).uploadImage(input),
      ).resolves.toEqual(asset);

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(PutObjectCommand).toHaveBeenCalledTimes(1);
      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: process.env.R2_BUCKET,
          Key: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/,
          ),
          Body: input.file,
          ContentType: input.mimeType,
        }),
      );
    });

    it("rejects empty alt_text before touching R2", async () => {
      const input = makeInput({ altText: "" });

      await expect(
        new MediaService(tenantId).uploadImage(input),
      ).rejects.toThrow("alt_text is required");

      expect(sendMock).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it("rejects whitespace-only alt_text before touching R2", async () => {
      const input = makeInput({ altText: "   " });

      await expect(
        new MediaService(tenantId).uploadImage(input),
      ).rejects.toThrow("alt_text is required");

      expect(sendMock).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it("rejects alt_text longer than 500 characters", async () => {
      const input = makeInput({ altText: "a".repeat(501) });

      await expect(
        new MediaService(tenantId).uploadImage(input),
      ).rejects.toThrow("alt_text must be 500 characters or less");

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("rejects files larger than 10 MB", async () => {
      const input = makeInput({
        file: Buffer.alloc(10 * 1024 * 1024 + 1),
      });

      await expect(
        new MediaService(tenantId).uploadImage(input),
      ).rejects.toThrow("file exceeds maximum size of 10 MB");

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("rejects empty files", async () => {
      const input = makeInput({ file: Buffer.alloc(0) });

      await expect(
        new MediaService(tenantId).uploadImage(input),
      ).rejects.toThrow("file cannot be empty");

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("rejects unsupported MIME types", async () => {
      const input = makeInput({ mimeType: "text/html" });

      await expect(
        new MediaService(tenantId).uploadImage(input),
      ).rejects.toThrow(
        /image\/jpeg|image\/png|image\/webp|image\/avif|application\/pdf/,
      );

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("rejects invalid media kind", async () => {
      const input = makeInput({
        kind: "INVALID" as unknown as UploadInput["kind"],
      });

      await expect(
        new MediaService(tenantId).uploadImage(input),
      ).rejects.toThrow(/IMAGE_GALLERY|PLAN|DOCUMENT/);

      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe("signedReadUrl", () => {
    function setupTxSelect(asset: MediaAsset) {
      const selectWhere = vi.fn().mockResolvedValue([asset]);
      (tx.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnValue({ where: selectWhere }),
      });
    }

    it("generates a signed URL for DOCUMENT kind with default TTL", async () => {
      const asset = fakeAsset({ kind: "DOCUMENT" });
      setupTxSelect(asset);
      getSignedUrlMock.mockResolvedValue("https://signed-url.example.com/doc");

      const url = await new MediaService(tenantId).signedReadUrl(asset.id);

      expect(url).toBe("https://signed-url.example.com/doc");
      expect(getSignedUrlMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        expect.objectContaining({ expiresIn: 3600 }),
      );
      expect(GetObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({ Bucket: "test-bucket", Key: asset.r2Key }),
      );
    });

    it("returns public URL for IMAGE_GALLERY kind without signing", async () => {
      const asset = fakeAsset({ kind: "IMAGE_GALLERY" });
      setupTxSelect(asset);

      const url = await new MediaService(tenantId).signedReadUrl(asset.id);

      expect(url).toBe("https://test.example.com/" + asset.r2Key);
      expect(getSignedUrlMock).not.toHaveBeenCalled();
      expect(GetObjectCommand).not.toHaveBeenCalled();
    });

    it("accepts a custom TTL parameter", async () => {
      const asset = fakeAsset({ kind: "DOCUMENT" });
      setupTxSelect(asset);
      getSignedUrlMock.mockResolvedValue("https://signed-url.example.com/custom");

      const url = await new MediaService(tenantId).signedReadUrl(asset.id, 1800);

      expect(url).toBe("https://signed-url.example.com/custom");
      expect(getSignedUrlMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        expect.objectContaining({ expiresIn: 1800 }),
      );
    });
  });

  describe("getPublicUrl", () => {
    it("returns a public URL from an R2 key", () => {
      const service = new MediaService(tenantId);
      const url = service.getPublicUrl("some-key.jpg");
      expect(url).toBe("https://test.example.com/some-key.jpg");
    });

    it("produces a well-formed URL", () => {
      const service = new MediaService(tenantId);
      const url = service.getPublicUrl("photo-123.webp");

      expect(url).toMatch(/^https:\/\/test\.example\.com\//);
      expect(url.endsWith("photo-123.webp")).toBe(true);
      expect(url).not.toContain("//photo-123.webp");
      expect(() => new URL(url)).not.toThrow();
    });
  });

  describe("reorderGallery", () => {
    it("updates sort_order values atomically for each asset", async () => {
      const assetIds = ["id-1", "id-2", "id-3"];
      const selectWhere = vi.fn().mockResolvedValue(
        assetIds.map((id) => fakeAsset({ id })),
      );
      (tx.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnValue({ where: selectWhere }),
      });

      const service = new MediaService(tenantId);

      await service.reorderGallery(ownerId, assetIds);

      expect(db.transaction).toHaveBeenCalled();
      expect(tx.update).toHaveBeenCalledTimes(3);
      expect(tx.update).toHaveBeenCalledWith(mediaAssets);

      const updateReturn = (tx.update as Mock).mock.results[0]?.value;
      expect(updateReturn?.set).toHaveBeenNthCalledWith(1, { sortOrder: 0 });
      expect(updateReturn?.set).toHaveBeenNthCalledWith(2, { sortOrder: 1 });
      expect(updateReturn?.set).toHaveBeenNthCalledWith(3, { sortOrder: 2 });
    });

    it("empty array is a no-op — returns without calling the database", async () => {
      const service = new MediaService(tenantId);

      await service.reorderGallery(ownerId, []);

      expect(db.transaction).not.toHaveBeenCalled();
    });

    it("rejects asset IDs that do not belong to the specified owner", async () => {
      const existingIds = ["id-1", "id-2"];
      const selectWhere = vi.fn().mockResolvedValue(
        existingIds.map((id) => fakeAsset({ id })),
      );
      (tx.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnValue({ where: selectWhere }),
      });

      const service = new MediaService(tenantId);
      const assetIds = ["id-1", "id-2", "id-3"];

      await expect(
        service.reorderGallery(ownerId, assetIds),
      ).rejects.toThrow("do not belong to the specified owner");

      expect(tx.select).toHaveBeenCalled();
      expect(tx.update).not.toHaveBeenCalled();
    });
  });

  describe("setCover", () => {
    const coverAssetId = "asset-id-1";

    it("marks a single asset as cover for the owner (clears others)", async () => {
      const selectWhere = vi.fn().mockResolvedValue([
        fakeAsset({ id: coverAssetId }),
      ]);
      (tx.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnValue({ where: selectWhere }),
      });

      const service = new MediaService(tenantId);

      await service.setCover(ownerId, coverAssetId);

      expect(db.transaction).toHaveBeenCalled();
      expect(tx.update).toHaveBeenCalledTimes(2);
      expect(tx.update).toHaveBeenCalledWith(mediaAssets);

      const updateReturn = (tx.update as Mock).mock.results[0]?.value;
      expect(updateReturn?.set).toHaveBeenNthCalledWith(1, {
        isCover: false,
      });
      expect(updateReturn?.set).toHaveBeenNthCalledWith(2, {
        isCover: true,
      });
    });

    it("idempotent — setting the same cover image twice does not fail", async () => {
      const selectWhere = vi.fn().mockResolvedValue([
        fakeAsset({ id: coverAssetId }),
      ]);
      (tx.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnValue({ where: selectWhere }),
      });

      const service = new MediaService(tenantId);

      await service.setCover(ownerId, coverAssetId);
      await expect(
        service.setCover(ownerId, coverAssetId),
      ).resolves.toBeUndefined();
    });

    it("rejects asset that does not belong to the specified owner", async () => {
      const selectWhere = vi.fn().mockResolvedValue([]);
      (tx.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnValue({ where: selectWhere }),
      });

      const service = new MediaService(tenantId);

      await expect(
        service.setCover(ownerId, "nonexistent-id"),
      ).rejects.toThrow("Asset not found");

      expect(tx.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    function setupTxSelect(asset: MediaAsset | null) {
      const rows = asset ? [asset] : [];
      const selectWhere = vi.fn().mockResolvedValue(rows);
      (tx.select as Mock).mockReturnValue({
        from: vi.fn().mockReturnValue({ where: selectWhere }),
      });
    }

    it("deletes the R2 object and DB record for an existing asset", async () => {
      const asset = fakeAsset();
      setupTxSelect(asset);

      await new MediaService(tenantId).delete(asset.id);

      // R2 deletion
      expect(DeleteObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({ Bucket: "test-bucket", Key: asset.r2Key }),
      );
      expect(sendMock).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));

      // DB deletion inside transaction
      expect(db.transaction).toHaveBeenCalled();
      expect(tx.delete).toHaveBeenCalledWith(mediaAssets);
      // delete().where(eq(...)) chain
      const deleteCall = (tx.delete as Mock).mock.results[0]?.value;
      expect(deleteCall?.where).toBeDefined();
    });

    it("throws 404 for non-existent asset and does not touch R2 or DB", async () => {
      setupTxSelect(null);

      await expect(
        new MediaService(tenantId).delete("nonexistent-id"),
      ).rejects.toThrow("Asset not found");

      expect(db.transaction).toHaveBeenCalled();
      expect(sendMock).not.toHaveBeenCalled();
    });

    it("does not update other assets when deleting a cover image", async () => {
      const asset = fakeAsset({ isCover: true });
      setupTxSelect(asset);

      await new MediaService(tenantId).delete(asset.id);

      // Cover should be cleaned (removed with the row), not transferred
      expect(tx.update).not.toHaveBeenCalled();

      // Should delete the original asset
      expect(tx.delete).toHaveBeenCalledWith(mediaAssets);
    });
  });
});
