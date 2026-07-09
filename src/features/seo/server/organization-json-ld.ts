import { getSiteUrl } from "@/shared/utils/seo/site-url";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrganizationJsonLdInput {
  /** Tenant display name (from tenants.name). */
  name: string;
  /** Tenant config JSONB (from tenants.config) — may contain `logo`. */
  config: Record<string, unknown> | null | undefined;
  /** Contact configuration (from contact_config table). */
  contactConfig: {
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
}

export interface OrganizationJsonLd {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  logo?: string;
  contactPoint?: {
    "@type": string;
    telephone?: string;
    email?: string;
    contactType: string;
  };
  address?: {
    "@type": string;
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    addressCountry: string;
  };
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Extracts the logo URL from tenant config if present and valid.
 */
function getLogoFromConfig(
  config: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!config || typeof config.logo !== "string" || config.logo.length === 0) {
    return undefined;
  }
  return config.logo;
}

/**
 * Extracts a non-empty string value from an optional string.
 */
function nonEmpty(value: string | null | undefined): string | undefined {
  if (value && value.length > 0) {
    return value;
  }
  return undefined;
}

/**
 * Builds an optional ContactPoint object from contact config.
 */
function buildContactPoint(
  contactConfig: {
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null,
):
  | {
      "@type": string;
      telephone?: string;
      email?: string;
      contactType: string;
    }
  | undefined {
  const phone = nonEmpty(contactConfig?.phone);
  const email = nonEmpty(contactConfig?.email);

  if (!phone && !email) {
    return undefined;
  }

  return {
    "@type": "ContactPoint",
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    contactType: "customer service",
  };
}

/**
 * Builds an optional PostalAddress object from contact config address.
 */
function buildAddress(
  contactConfig: {
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null,
):
  | {
      "@type": string;
      streetAddress: string;
      addressRegion: string;
      addressCountry: string;
    }
  | undefined {
  const addressStr = nonEmpty(contactConfig?.address);

  if (!addressStr) {
    return undefined;
  }

  return {
    "@type": "PostalAddress",
    streetAddress: addressStr,
    addressRegion: "Canarias",
    addressCountry: "ES",
  };
}

/**
 * Builds a schema.org `Organization` JSON-LD object for the home page.
 *
 * - `name`: from the tenant name.
 * - `url`: from `getSiteUrl()`.
 * - `logo`: from `config.logo` if present and is a non-empty string.
 * - `contactPoint`: from `contactConfig.phone` and/or `contactConfig.email`.
 *   Only included when at least one of phone or email is non-null and non-empty.
 * - `address`: from `contactConfig.address` with `addressRegion: "Canarias"`
 *   and `addressCountry: "ES"`. Only included when address is non-null and non-empty.
 */
export function buildOrganizationJsonLd(
  input: OrganizationJsonLdInput,
): OrganizationJsonLd {
  const siteUrl = getSiteUrl();
  const logo = getLogoFromConfig(input.config);
  const contactPoint = buildContactPoint(input.contactConfig);
  const address = buildAddress(input.contactConfig);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: siteUrl,
    ...(logo ? { logo } : {}),
    ...(contactPoint ? { contactPoint } : {}),
    ...(address ? { address } : {}),
  };
}
