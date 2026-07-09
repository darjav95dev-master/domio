import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";
import { SITEMAP_LIMITS } from "@/shared/utils/seo/constants";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const NOW = new Date("2026-07-08T12:00:00Z");
const OLDER_DATE = new Date("2026-06-15T10:30:00Z");

const publishedPortfolio = {
  id: "p1",
  tenantId: "tenant-1",
  slug: "piso-en-venta-en-santa-cruz-3hab-a4c9",
  name: "Piso en Santa Cruz",
  kind: "portfolio" as const,
  status: "PUBLISHED" as const,
  operation: "SALE" as const,
  propertyType: "piso" as const,
  constructionStatus: null,
  island: "Tenerife",
  municipality: "Santa Cruz",
  address: null,
  location: [-16.5, 28.1] as [number, number],
  locationApprox: [-16.5, 28.1] as [number, number],
  mapPrivacyMode: "EXACT" as const,
  seoTitle: null,
  seoDescription: null,
  assignedAgentId: null,
  assignedAgentName: null,
  draftPayload: null,
  createdAt: new Date("2026-07-01"),
  updatedAt: NOW,
};

const publishedExternal = {
  id: "p2",
  tenantId: "tenant-1",
  slug: "casa-en-venta-en-la-laguna-5hab-b7e2",
  name: "Casa en La Laguna",
  kind: "external" as const,
  status: "PUBLISHED" as const,
  operation: "SALE" as const,
  propertyType: "casa" as const,
  constructionStatus: null,
  island: "Tenerife",
  municipality: "La Laguna",
  address: null,
  location: [-16.3, 28.4] as [number, number],
  locationApprox: [-16.3, 28.4] as [number, number],
  mapPrivacyMode: "EXACT" as const,
  seoTitle: null,
  seoDescription: null,
  assignedAgentId: null,
  assignedAgentName: null,
  draftPayload: null,
  createdAt: new Date("2026-06-15"),
  updatedAt: OLDER_DATE,
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
function createMockPromocionRepository(
  items: Array<Record<string, unknown>> = [],
) {
  return {
    findPublicWithCursor: vi.fn().mockResolvedValue({
      items,
      nextCursor: null,
      total: items.length,
    }),
  } as unknown as PromocionRepository;
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("buildSitemapUrls", () => {
  it("returns a sitemap entry for each published promotion", async () => {
    const mockRepo = createMockPromocionRepository([
      publishedPortfolio,
      publishedExternal,
    ]);
    const { buildSitemapUrls } = await import("../sitemap-urls");

    const result = await buildSitemapUrls(mockRepo);

    expect(result).toHaveLength(2);
  });

  it("builds absolute loc URL with slug appended to site URL", async () => {
    const mockRepo = createMockPromocionRepository([publishedPortfolio]);
    process.env.NEXT_PUBLIC_SITE_URL = "https://domio.com";
    const { buildSitemapUrls } = await import("../sitemap-urls");

    const result = await buildSitemapUrls(mockRepo);

    expect(result[0]?.loc).toBe(
      "https://domio.com/inmuebles/piso-en-venta-en-santa-cruz-3hab-a4c9",
    );
  });

  it("sets changefreq to weekly for all promotion entries", async () => {
    const mockRepo = createMockPromocionRepository([
      publishedPortfolio,
      publishedExternal,
    ]);
    const { buildSitemapUrls } = await import("../sitemap-urls");

    const result = await buildSitemapUrls(mockRepo);

    for (const entry of result) {
      expect(entry.changefreq).toBe("weekly");
    }
  });

  it("uses updated_at as lastmod in YYYY-MM-DD format", async () => {
    const mockRepo = createMockPromocionRepository([publishedPortfolio]);
    const { buildSitemapUrls } = await import("../sitemap-urls");

    const result = await buildSitemapUrls(mockRepo);

    expect(result[0]?.lastmod).toBe("2026-07-08");
  });

  it("returns entries where lastmod reflects each promotion's updated_at", async () => {
    const mockRepo = createMockPromocionRepository([
      publishedPortfolio,
      publishedExternal,
    ]);
    const { buildSitemapUrls } = await import("../sitemap-urls");

    const result = await buildSitemapUrls(mockRepo);

    expect(result[0]?.lastmod).toBe("2026-07-08");
    expect(result[1]?.lastmod).toBe("2026-06-15");
  });

  it("returns empty array when no published promotions exist", async () => {
    const mockRepo = createMockPromocionRepository([]);
    const { buildSitemapUrls } = await import("../sitemap-urls");

    const result = await buildSitemapUrls(mockRepo);

    expect(result).toHaveLength(0);
  });

  it("queries the repository with default (empty) filters", async () => {
    const findPublicWithCursor = vi.fn().mockResolvedValue({
      items: [publishedPortfolio],
      nextCursor: null,
      total: 1,
    });
    const mockRepo = {
      findPublicWithCursor,
    } as unknown as PromocionRepository;
    const { buildSitemapUrls } = await import("../sitemap-urls");

    await buildSitemapUrls(mockRepo);

    expect(findPublicWithCursor).toHaveBeenCalledTimes(1);
    expect(findPublicWithCursor).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ limit: SITEMAP_LIMITS.MAX_URLS_PER_RESPONSE }),
    );
  });

  it("uses http://localhost:3000 as fallback when env var is not set", async () => {
    const mockRepo = createMockPromocionRepository([publishedPortfolio]);
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const { buildSitemapUrls } = await import("../sitemap-urls");

    const result = await buildSitemapUrls(mockRepo);

    expect(result[0]?.loc).toBe(
      "http://localhost:3000/inmuebles/piso-en-venta-en-santa-cruz-3hab-a4c9",
    );
  });
});
