import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { MediaAsset } from "../db/schema/media-assets";
import { mediaAssets } from "../db/schema/media-assets";
import type { TenantContext } from "../tenant/TenantContext";
import {
  ALLOWED_MEDIA_KINDS,
  ALLOWED_UPLOAD_MIME_TYPES,
  DEFAULT_MEDIA_OWNER_TYPE,
  MAX_ALT_TEXT_LENGTH,
  MAX_UPLOAD_SIZE_BYTES,
} from "./constants";
import { mediaEnv } from "./env";
import { r2Client } from "./r2-client";
import type { TransformOptions, UploadInput } from "./types";
import { UploadValidationError } from "./types";

export class MediaService {
  private readonly s3Client = r2Client;

  constructor(private readonly ctx: TenantContext) {}

  async uploadImage(input: UploadInput): Promise<MediaAsset> {
    const trimmedAltText = input.altText.trim();
    if (trimmedAltText.length === 0) {
      throw new UploadValidationError("alt_text is required");
    }
    if (trimmedAltText.length > MAX_ALT_TEXT_LENGTH) {
      throw new UploadValidationError(
        "alt_text must be 500 characters or less",
      );
    }

    if (input.file.length === 0) {
      throw new UploadValidationError("file cannot be empty");
    }
    if (input.file.length > MAX_UPLOAD_SIZE_BYTES) {
      throw new UploadValidationError("file exceeds maximum size of 10 MB");
    }

    if (
      !ALLOWED_UPLOAD_MIME_TYPES.includes(
        input.mimeType as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number],
      )
    ) {
      throw new UploadValidationError(
        `Unsupported MIME type. Allowed: ${ALLOWED_UPLOAD_MIME_TYPES.join(", ")}`,
      );
    }

    if (
      !ALLOWED_MEDIA_KINDS.includes(
        input.kind as (typeof ALLOWED_MEDIA_KINDS)[number],
      )
    ) {
      throw new UploadValidationError(
        `Invalid kind. Must be ${ALLOWED_MEDIA_KINDS.join(", ")}`,
      );
    }

    const extension = input.fileName.split(".").pop()?.toLowerCase() || "bin";
    const r2Key = `${randomUUID()}.${extension}`;
    const tenantId = this.ctx.getTenantId();

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: mediaEnv.R2_BUCKET,
        Key: r2Key,
        Body: input.file,
        ContentType: input.mimeType,
      }),
    );

    return this.ctx.withTransaction(async (tx) => {
      const rows = await tx.insert(mediaAssets).values({
        tenantId,
        ownerType: DEFAULT_MEDIA_OWNER_TYPE,
        ownerId: input.ownerId,
        kind: input.kind,
        r2Key,
        mimeType: input.mimeType,
        sizeBytes: input.file.length,
        altText: trimmedAltText,
      }).returning();
      return rows[0] as MediaAsset;
    });
  }

  async signedReadUrl(
    assetId: string,
    ttlSeconds: number = 3600,
    opts?: TransformOptions,
  ): Promise<string> {
    const tenantId = this.ctx.getTenantId();

    const asset = await this.ctx.withTransaction(async (tx) => {
      const [found] = await tx.select().from(mediaAssets).where(
        and(eq(mediaAssets.id, assetId), eq(mediaAssets.tenantId, tenantId)),
      );
      return found;
    });

    if (!asset) {
      throw new Error("Asset not found");
    }

    if (asset.kind === "IMAGE_GALLERY") {
      return this.getPublicUrl(asset.r2Key);
    }

    const command = new GetObjectCommand({
      Bucket: mediaEnv.R2_BUCKET,
      Key: asset.r2Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: ttlSeconds });
  }

  getPublicUrl(r2Key: string): string {
    return `${mediaEnv.R2_PUBLIC_URL}/${r2Key}`;
  }

  async reorderGallery(
    ownerId: string,
    orderedAssetIds: string[],
  ): Promise<void> {
    if (orderedAssetIds.length === 0) {
      return;
    }

    const tenantId = this.ctx.getTenantId();

    await this.ctx.withTransaction(async (tx) => {
      const existing = await tx
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(
          and(
            inArray(mediaAssets.id, orderedAssetIds),
            eq(mediaAssets.ownerId, ownerId),
            eq(mediaAssets.tenantId, tenantId),
          ),
        );

      if (existing.length !== orderedAssetIds.length) {
        throw new Error(
          "One or more asset IDs do not belong to the specified owner",
        );
      }

      for (const [i, assetId] of orderedAssetIds.entries()) {
        await tx
          .update(mediaAssets)
          .set({ sortOrder: i })
          .where(
            and(
              eq(mediaAssets.id, assetId),
              eq(mediaAssets.ownerId, ownerId),
              eq(mediaAssets.tenantId, tenantId),
            ),
          );
      }
    });
  }

  async setCover(ownerId: string, assetId: string): Promise<void> {
    const tenantId = this.ctx.getTenantId();

    await this.ctx.withTransaction(async (tx) => {
      const [asset] = await tx
        .select({ id: mediaAssets.id })
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.id, assetId),
            eq(mediaAssets.ownerId, ownerId),
            eq(mediaAssets.tenantId, tenantId),
          ),
        );

      if (!asset) {
        throw new Error("Asset not found for the specified owner");
      }

      await tx
        .update(mediaAssets)
        .set({ isCover: false })
        .where(
          and(
            eq(mediaAssets.ownerId, ownerId),
            eq(mediaAssets.tenantId, tenantId),
          ),
        );

      await tx
        .update(mediaAssets)
        .set({ isCover: true })
        .where(
          and(
            eq(mediaAssets.id, assetId),
            eq(mediaAssets.ownerId, ownerId),
            eq(mediaAssets.tenantId, tenantId),
          ),
        );
    });
  }

  async delete(assetId: string): Promise<void> {
    const tenantId = this.ctx.getTenantId();

    await this.ctx.withTransaction(async (tx) => {
      const [asset] = await tx.select().from(mediaAssets).where(
        and(eq(mediaAssets.id, assetId), eq(mediaAssets.tenantId, tenantId)),
      );

      if (!asset) {
        throw new Error("Asset not found");
      }

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: mediaEnv.R2_BUCKET,
          Key: asset.r2Key,
        }),
      );

      await tx.delete(mediaAssets).where(eq(mediaAssets.id, assetId));
    });
  }
}
