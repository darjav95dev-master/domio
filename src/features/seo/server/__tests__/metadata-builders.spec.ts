/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/**
 * Mock `getOrganizationData` so that `buildPageMetadata` does not hit the DB.
 * By default the mock returns `{ tenant: null }`, which triggers the
 * `resolveDefaultOgImage` static fallback (`getSiteUrl() + /og-default.jpg`).
 */
vi.mock("../get-organization-data", () => ({
  getOrganizationData: vi.fn().mockResolvedValue({ tenant: null, contact: null }),
}));

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
describe("buildPageMetadata", () => {
  it("returns a Metadata object with title and description from input", async () => {
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Domio — Tu hogar en Canarias",
      description: "Encuentra tu hogar ideal en Canarias",
      path: "/",
    });

    expect(result.title).toBe("Domio — Tu hogar en Canarias");
    expect(result.description).toBe("Encuentra tu hogar ideal en Canarias");
  });

  it("builds alternates.canonical using getSiteUrl plus the path", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://wedomio.com";
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Portafolio",
      description: "Catálogo de inmuebles",
      path: "/portafolio",
    });

    expect(result.alternates?.canonical).toBe(
      "https://wedomio.com/portafolio",
    );
  });

  it("sets openGraph.type to 'website' by default", async () => {
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Home",
      description: "Home page",
      path: "/",
    });

    expect(result.openGraph).toMatchObject({ type: "website" });
  });

  it("uses custom ogType when provided", async () => {
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Article",
      description: "Article page",
      path: "/article",
      ogType: "article",
    });

    expect(result.openGraph).toMatchObject({ type: "article" });
  });

  it("includes openGraph.url derived from site URL and path", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://wedomio.com";
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Detail",
      description: "Detail page",
      path: "/inmuebles/piso-en-santa-cruz",
    });

    expect(result.openGraph?.url).toBe(
      "https://wedomio.com/inmuebles/piso-en-santa-cruz",
    );
  });

  it("includes openGraph.images with the provided ogImage as first element", async () => {
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Detail",
      description: "Detail page",
      path: "/inmuebles/piso-en-santa-cruz",
      ogImage: "https://media.wedomio.com/promociones/cover-123.jpg",
    });

    const images = result.openGraph?.images;
    expect(images).toBeDefined();

    // images can be a string or array — normalise for assertion
    const imageList = Array.isArray(images) ? images : [images];
    expect(imageList[0]).toBe(
      "https://media.wedomio.com/promociones/cover-123.jpg",
    );
  });

  it("includes default OG image fallback when ogImage is not provided", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://wedomio.com";
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Home",
      description: "Home page",
      path: "/",
    });

    const images = result.openGraph?.images;
    expect(images).toBeDefined();

    const imageList = Array.isArray(images) ? images : [images];
    expect(imageList[0]).toBe("https://wedomio.com/og-default.jpg");
  });

  it("sets twitter.card to summary_large_image", async () => {
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Home",
      description: "Home page",
      path: "/",
    });

    expect(result.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("sets twitter.title and twitter.description from input", async () => {
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Domio — Tu hogar en Canarias",
      description: "Encuentra tu hogar ideal en Canarias",
      path: "/",
    });

    expect(result.twitter?.title).toBe("Domio — Tu hogar en Canarias");
    expect(result.twitter?.description).toBe(
      "Encuentra tu hogar ideal en Canarias",
    );
  });

  it("sets twitter.images to the OG image when provided", async () => {
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Detail",
      description: "Detail page",
      path: "/inmuebles/piso-en-santa-cruz",
      ogImage: "https://media.wedomio.com/promociones/cover-123.jpg",
    });

    // Twitter images should match the OG image
    const twImages = result.twitter?.images;
    expect(twImages).toBeDefined();
    const twImageList = Array.isArray(twImages) ? twImages : [twImages];
    expect(twImageList[0]).toBe(
      "https://media.wedomio.com/promociones/cover-123.jpg",
    );
  });

  it("sets robots to index:true and follow:true", async () => {
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Home",
      description: "Home page",
      path: "/",
    });

    expect(result.robots).toEqual({ index: true, follow: true });
  });

  it("sets openGraph.siteName to 'Domio' and locale to 'es_ES'", async () => {
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Home",
      description: "Home page",
      path: "/",
    });

    expect(result.openGraph?.siteName).toBe("Domio");
    expect(result.openGraph?.locale).toBe("es_ES");
  });

  it("uses http://localhost:3000 as fallback for canonical when env var is not set", async () => {
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Contacto",
      description: "Contacta con nosotros",
      path: "/contacto",
    });

    expect(result.alternates?.canonical).toBe(
      "http://localhost:3000/contacto",
    );
    expect(result.openGraph?.url).toBe("http://localhost:3000/contacto");
  });

  it("strips trailing slash from site URL for canonical construction", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://wedomio.com/";
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Sobre",
      description: "Sobre Domio",
      path: "/sobre",
    });

    expect(result.alternates?.canonical).toBe("https://wedomio.com/sobre");
  });

  it("includes openGraph.title and openGraph.description matching input", async () => {
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Portafolio — Domio",
      description: "Explora nuestro catálogo de inmuebles",
      path: "/portafolio",
    });

    expect(result.openGraph?.title).toBe("Portafolio — Domio");
    expect(result.openGraph?.description).toBe(
      "Explora nuestro catálogo de inmuebles",
    );
  });

  it("uses tenant defaultOgImage when tenant config has one and no ogImage provided", async () => {
    const { getOrganizationData } = await import("../get-organization-data");

    vi.mocked(getOrganizationData).mockResolvedValueOnce({
      tenant: { name: "Domio", config: { defaultOgImage: "https://cdn.wedomio.com/og-tenant.jpg" } },
      contact: null,
    });

    process.env.NEXT_PUBLIC_SITE_URL = "https://wedomio.com";
    const { buildPageMetadata } = await import("../build-page-metadata");

    const result = await buildPageMetadata({
      title: "Home",
      description: "Home page",
      path: "/",
    });

    const images = result.openGraph?.images;
    expect(images).toBeDefined();
    const imageList = Array.isArray(images) ? images : [images];
    expect(imageList[0]).toBe("https://cdn.wedomio.com/og-tenant.jpg");
  });
});
