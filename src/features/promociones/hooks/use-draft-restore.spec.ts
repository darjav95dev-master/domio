import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDraftRestore } from "./use-draft-restore";

describe("useDraftRestore", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const promocionId = "promo-123";

  const publishedData = {
    name: "Published Name",
    kind: "portfolio" as const,
    status: "PUBLISHED" as const,
    propertyType: "piso",
    operation: "SALE",
    constructionStatus: null,
    island: "Tenerife",
    municipality: "Santa Cruz",
    address: "Calle 123",
    mapPrivacyMode: "EXACT",
    seoTitle: null,
    seoDescription: null,
    assignedAgentId: null,
  };

  const draftPayload = {
    name: "Draft Name Changed",
    kind: "portfolio" as const,
    status: "PUBLISHED" as const,
    propertyType: "piso",
    operation: "SALE",
    constructionStatus: null,
    island: "Tenerife",
    municipality: "San Cristóbal",
    address: "Calle 456",
    mapPrivacyMode: "EXACT",
    seoTitle: "New SEO Title",
    seoDescription: null,
    assignedAgentId: null,
  };

  it("should detect draft exists when initialData has draftPayload", () => {
    const { result } = renderHook(() =>
      useDraftRestore(promocionId, publishedData, draftPayload),
    );

    expect(result.current.hasDraft).toBe(true);
    expect(result.current.draftData).toEqual(draftPayload);
  });

  it("should report no draft when draftPayload is null", () => {
    const { result } = renderHook(() =>
      useDraftRestore(promocionId, publishedData, null),
    );

    expect(result.current.hasDraft).toBe(false);
    expect(result.current.draftData).toBeNull();
  });

  it("applyDraft should return the draftPayload as form state", () => {
    const { result } = renderHook(() =>
      useDraftRestore(promocionId, publishedData, draftPayload),
    );

    const applied = result.current.applyDraft();
    expect(applied).toEqual(draftPayload);
    // Should be a merged result: draft overrides published
    expect(applied.name).toBe("Draft Name Changed");
    expect(applied.municipality).toBe("San Cristóbal");
  });

  it("discardDraft should call DELETE and reset hasDraft", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ draftPayload: null, updatedAt: new Date().toISOString() }),
    });

    const { result } = renderHook(() =>
      useDraftRestore(promocionId, publishedData, draftPayload),
    );

    expect(result.current.hasDraft).toBe(true);

    await act(async () => {
      await result.current.discardDraft();
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/internal/promociones/${promocionId}/draft`,
      expect.objectContaining({
        method: "DELETE",
      }),
    );

    expect(result.current.hasDraft).toBe(false);
    expect(result.current.draftData).toBeNull();
  });
});
