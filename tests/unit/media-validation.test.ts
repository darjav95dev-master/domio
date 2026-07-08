/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import {
  altTextSchema,
  mediaKindSchema,
  uploadMediaSchema,
  deleteMediaSchema,
  reorderMediaSchema,
  setCoverSchema,
} from "@/shared/types/media-schema";

describe("altTextSchema", () => {
  it("accepts a non-empty string", () => {
    const result = altTextSchema.safeParse("Vista frontal del edificio");
    expect(result.success).toBe(true);
  });

  it("rejects empty string", () => {
    const result = altTextSchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "El texto alternativo es obligatorio",
      );
    }
  });

  it("rejects whitespace-only string", () => {
    const result = altTextSchema.safeParse("   ");
    expect(result.success).toBe(false);
  });

  it("rejects null", () => {
    const result = altTextSchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("rejects undefined", () => {
    const result = altTextSchema.safeParse(undefined);
    expect(result.success).toBe(false);
  });

  it("accepts a string of exactly 500 characters", () => {
    const result = altTextSchema.safeParse("a".repeat(500));
    expect(result.success).toBe(true);
  });

  it("rejects a string longer than 500 characters", () => {
    const result = altTextSchema.safeParse("a".repeat(501));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("500");
    }
  });
});

describe("mediaKindSchema", () => {
  it("accepts IMAGE_GALLERY", () => {
    const result = mediaKindSchema.safeParse("IMAGE_GALLERY");
    expect(result.success).toBe(true);
  });

  it("accepts PLAN", () => {
    const result = mediaKindSchema.safeParse("PLAN");
    expect(result.success).toBe(true);
  });

  it("accepts DOCUMENT", () => {
    const result = mediaKindSchema.safeParse("DOCUMENT");
    expect(result.success).toBe(true);
  });

  it("rejects an invalid kind string", () => {
    const result = mediaKindSchema.safeParse("INVALID");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = mediaKindSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("uploadMediaSchema", () => {
  it("accepts a valid upload payload", () => {
    const result = uploadMediaSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "IMAGE_GALLERY",
      altText: "Entrada principal",
    });
    expect(result.success).toBe(true);
  });

  it("rejects upload with empty altText", () => {
    const result = uploadMediaSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "IMAGE_GALLERY",
      altText: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects upload with invalid kind", () => {
    const result = uploadMediaSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "INVALID",
      altText: "Entrada principal",
    });
    expect(result.success).toBe(false);
  });

  it("rejects upload with non-UUID promocionId", () => {
    const result = uploadMediaSchema.safeParse({
      promocionId: "not-a-uuid",
      kind: "IMAGE_GALLERY",
      altText: "Entrada principal",
    });
    expect(result.success).toBe(false);
  });

  it("rejects upload with missing promocionId", () => {
    const result = uploadMediaSchema.safeParse({
      kind: "IMAGE_GALLERY",
      altText: "Entrada principal",
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteMediaSchema", () => {
  it("accepts a valid delete payload", () => {
    const result = deleteMediaSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
      assetId: "660e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects delete with non-UUID assetId", () => {
    const result = deleteMediaSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
      assetId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects delete with missing assetId", () => {
    const result = deleteMediaSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });
});

describe("reorderMediaSchema", () => {
  it("accepts a valid reorder payload", () => {
    const result = reorderMediaSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "IMAGE_GALLERY",
      orderedAssetIds: [
        "660e8400-e29b-41d4-a716-446655440001",
        "660e8400-e29b-41d4-a716-446655440002",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty orderedAssetIds array", () => {
    const result = reorderMediaSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "IMAGE_GALLERY",
      orderedAssetIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID asset IDs in orderedAssetIds", () => {
    const result = reorderMediaSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
      kind: "IMAGE_GALLERY",
      orderedAssetIds: ["not-a-uuid"],
    });
    expect(result.success).toBe(false);
  });
});

describe("setCoverSchema", () => {
  it("accepts a valid setCover payload", () => {
    const result = setCoverSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
      assetId: "660e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects setCover with non-UUID assetId", () => {
    const result = setCoverSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
      assetId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});
