import { getSiteUrl } from "@/shared/utils/seo/site-url";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BreadcrumbJsonLdInput {
  /** Promotion display name. */
  name: string;
  /** Promotion slug used in the URL path (null for unpublished promotions). */
  slug: string | null;
}

export interface BreadcrumbJsonLdElement {
  "@type": string;
  position: number;
  name: string;
  item: string;
}

export interface BreadcrumbJsonLd {
  "@context": string;
  "@type": string;
  itemListElement: BreadcrumbJsonLdElement[];
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Builds a schema.org `BreadcrumbList` JSON-LD object for a promotion detail
 * page.
 *
 * The breadcrumb trail has 3 levels:
 * 1. Home → `getSiteUrl()`
 * 2. Portafolio → `getSiteUrl() + "/portafolio"`
 * 3. Promotion name → `getSiteUrl() + "/inmuebles/" + slug`
 */
export function buildBreadcrumbJsonLd(
  input: BreadcrumbJsonLdInput,
): BreadcrumbJsonLd {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Promociones",
        item: `${siteUrl}/portafolio`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: input.name,
        item: `${siteUrl}/inmuebles/${input.slug ?? ""}`,
      },
    ],
  };
}
