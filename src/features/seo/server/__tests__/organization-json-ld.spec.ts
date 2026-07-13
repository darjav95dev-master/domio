import { describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TENANT_NAME = "Domio";
const MODULE_PATH = "../organization-json-ld";
const SITE_URL = "https://wedomio.com";
const LOGO_URL = "https://wedomio.com/logo.png";
const PHONE = "+34-922-123-456";
const EMAIL = "info@wedomio.com";
const ADDRESS = "Calle Principal 1, 38001 Santa Cruz de Tenerife";

const CONFIG_WITH_LOGO: Record<string, unknown> = { logo: LOGO_URL };
const CONFIG_EMPTY: Record<string, unknown> = {};
const CONTACT_FULL = { phone: PHONE, email: EMAIL, address: ADDRESS };
const CONTACT_NULL = null;
const CONTACT_PARTIAL = { phone: PHONE, email: null, address: null };
const CONTACT_NO_PHONE_EMAIL = { phone: null, email: null, address: null };

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
async function build(input?: {
  name?: string;
  config?: Record<string, unknown> | null;
  contactConfig?: Record<string, unknown> | null;
}) {
  const { buildOrganizationJsonLd } = await import(MODULE_PATH);
  return buildOrganizationJsonLd({
    name: input?.name ?? TENANT_NAME,
    config: input?.config ?? CONFIG_EMPTY,
    contactConfig: input?.contactConfig ?? CONTACT_NULL,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("buildOrganizationJsonLd", () => {
  it("returns a valid Organization JSON-LD with @context and @type", async () => {
    const result = await build();

    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("Organization");
  });

  it("includes name from tenant name", async () => {
    const result = await build();

    expect(result.name).toBe(TENANT_NAME);
  });

  it("includes url from getSiteUrl()", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE_URL;
    const result = await build();

    expect(result.url).toBe(SITE_URL);
  });

  it("includes logo from tenant config when present", async () => {
    const result = await build({ config: CONFIG_WITH_LOGO });

    expect(result.logo).toBe(LOGO_URL);
  });

  it("omits logo when tenant config has no logo", async () => {
    const result = await build({ config: CONFIG_EMPTY });

    expect(result.logo).toBeUndefined();
  });

  it("includes contactPoint with telephone and email from contactConfig", async () => {
    const result = await build({ contactConfig: CONTACT_FULL });

    expect(result.contactPoint).toBeDefined();
    expect(result.contactPoint!["@type"]).toBe("ContactPoint");
    expect(result.contactPoint!.telephone).toBe(PHONE);
    expect(result.contactPoint!.email).toBe(EMAIL);
    expect(result.contactPoint!.contactType).toBe("customer service");
  });

  it("omits contactPoint when contactConfig is null", async () => {
    const result = await build({ contactConfig: CONTACT_NULL });

    expect(result.contactPoint).toBeUndefined();
  });

  it("omits contactPoint when contactConfig has no phone or email", async () => {
    const result = await build({ contactConfig: CONTACT_NO_PHONE_EMAIL });

    expect(result.contactPoint).toBeUndefined();
  });

  it("includes only telephone in contactPoint when email is missing", async () => {
    const result = await build({ contactConfig: CONTACT_PARTIAL });

    expect(result.contactPoint).toBeDefined();
    expect(result.contactPoint!.telephone).toBe(PHONE);
    expect(result.contactPoint!.email).toBeUndefined();
  });

  it("includes address with streetAddress from contactConfig", async () => {
    const result = await build({ contactConfig: CONTACT_FULL });

    expect(result.address).toBeDefined();
    expect(result.address!["@type"]).toBe("PostalAddress");
    expect(result.address!.streetAddress).toBe(ADDRESS);
  });

  it("sets addressRegion to Canarias and addressCountry to ES", async () => {
    const result = await build({ contactConfig: CONTACT_FULL });

    expect(result.address!.addressRegion).toBe("Canarias");
    expect(result.address!.addressCountry).toBe("ES");
  });

  it("omits address when contactConfig address is null", async () => {
    const result = await build({ contactConfig: CONTACT_PARTIAL });

    expect(result.address).toBeUndefined();
  });

  it("omits address when contactConfig is null", async () => {
    const result = await build({ contactConfig: CONTACT_NULL });

    expect(result.address).toBeUndefined();
  });

  it("uses http://localhost:3000 as fallback url when env var is not set", async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const result = await build();

    expect(result.url).toBe("http://localhost:3000");
  });
});
