/**
 * SEO constants: sitemap change frequencies, priority values,
 * and default metadata for Domio public pages.
 */

/** Change frequency values for sitemap.xml entries */
export const SITEMAP_CHANGE_FREQ = {
  PORTFOLIO: "daily" as const,
  DETAIL: "weekly" as const,
  STATIC: "monthly" as const,
} as const;

/** Priority values (0.0 – 1.0) for sitemap.xml entries */
export const SITEMAP_PRIORITY = {
  HOME: 1.0,
  PORTFOLIO: 0.8,
  DETAIL: 0.6,
  STATIC_PAGES: 0.5,
} as const;

/** Default metadata values used as fallback when no custom SEO is set */
export const DEFAULT_META = {
  SITE_NAME: "Domio",
  SITE_DESCRIPTION: "Tu hogar en Canarias empieza aquí",
  TWITTER_CARD: "summary_large_image" as const,
} as const;

/** Limits for sitemap.xml generation */
export const SITEMAP_LIMITS = {
  /** Max URLs per sitemap response (Google's limit is 50,000). */
  MAX_URLS_PER_RESPONSE: 50_000,
} as const;

/** Fallback title template parts for detail pages */
export const FALLBACK_META = {
  /** Used when propertyType is null or unknown */
  GENERIC_PROPERTY_TYPE: "Inmueble",
  /** Used when operation is null or unknown */
  GENERIC_OPERATION: "operación",
  /** Used when municipality is null */
  UNKNOWN_LOCATION: "zona desconocida",
  /** Separator between property description and site name */
  TITLE_SEPARATOR: " | ",
  /** Max length for fallback description before truncation */
  DESCRIPTION_MAX_LENGTH: 155,
  /** Fallback description when no content block text is available */
  FALLBACK_DESCRIPTION_TEMPLATE:
    "{title}. Descubre esta increíble propiedad en Domio.",
} as const;
