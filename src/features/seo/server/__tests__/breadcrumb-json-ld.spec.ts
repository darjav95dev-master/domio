import { describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PROMO_NAME = "Residencial Las Américas";
const PROMO_SLUG = "piso-en-venta-en-santa-cruz-3hab-a4c9";
const SITE_URL = "https://domio.com";
const MODULE_PATH = "../breadcrumb-json-ld";

// ---------------------------------------------------------------------------
// Environment setup (getSiteUrl reads process.env)
// ---------------------------------------------------------------------------
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function build(input?: { name?: string; slug?: string }) {
  const { buildBreadcrumbJsonLd } = await import(MODULE_PATH);
  return buildBreadcrumbJsonLd({
    name: input?.name ?? PROMO_NAME,
    slug: input?.slug ?? PROMO_SLUG,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("buildBreadcrumbJsonLd", () => {
  it("returns a valid BreadcrumbList JSON-LD with @context and @type", async () => {
    const result = await build();

    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("BreadcrumbList");
  });

  it("includes 3 itemListElements (Home, Portafolio, Promotion)", async () => {
    const result = await build();

    expect(result.itemListElement).toHaveLength(3);
  });

  it("Home element has position 1, name 'Home', and url from getSiteUrl()", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;
    const result = await build();
    const home = result.itemListElement[0]!;

    expect(home["@type"]).toBe("ListItem");
    expect(home.position).toBe(1);
    expect(home.name).toBe("Home");
    expect(home.item).toBe(SITE_URL);
  });

  it("Portafolio element has position 2, name 'Portafolio', url with /portafolio", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;
    const result = await build();
    const portafolio = result.itemListElement[1]!;

    expect(portafolio["@type"]).toBe("ListItem");
    expect(portafolio.position).toBe(2);
    expect(portafolio.name).toBe("Promociones");
    expect(portafolio.item).toBe(`${SITE_URL}/portafolio`);
  });

  it("Promotion element has position 3, name from input, url with /inmuebles/slug", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;
    const result = await build();
    const promo = result.itemListElement[2]!;

    expect(promo["@type"]).toBe("ListItem");
    expect(promo.position).toBe(3);
    expect(promo.name).toBe(PROMO_NAME);
    expect(promo.item).toBe(`${SITE_URL}/inmuebles/${PROMO_SLUG}`);
  });

  it("elements appear in correct order: Home, Portafolio, Promotion", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;
    const result = await build({
      name: "Casa en La Laguna",
      slug: "casa-en-venta-en-la-laguna-5hab-b7e2",
    });

    expect(result.itemListElement[0]!.position).toBe(1);
    expect(result.itemListElement[0]!.name).toBe("Home");
    expect(result.itemListElement[1]!.position).toBe(2);
    expect(result.itemListElement[1]!.name).toBe("Promociones");
    expect(result.itemListElement[2]!.position).toBe(3);
    expect(result.itemListElement[2]!.name).toBe("Casa en La Laguna");
  });

  it("uses http://localhost:3000 as fallback when env var is not set", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const result = await build();

    expect(result.itemListElement[0]!.item).toBe("http://localhost:3000");
    expect(result.itemListElement[1]!.item).toBe(
      "http://localhost:3000/portafolio",
    );
    expect(result.itemListElement[2]!.item).toBe(
      "http://localhost:3000/inmuebles/piso-en-venta-en-santa-cruz-3hab-a4c9",
    );
  });
});
