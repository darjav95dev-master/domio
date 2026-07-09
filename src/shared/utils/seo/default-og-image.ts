import { getSiteUrl } from "./site-url";

/**
 * Returns the default Open Graph image URL for a given tenant.
 *
 * Priority:
 * 1. Tenant config's `defaultOgImage` if set and non-empty.
 * 2. A sensible fallback URL derived from the site's base URL.
 *
 * @param tenantConfig - The tenant's `config` JSONB object, or null/undefined.
 */
export function resolveDefaultOgImage(
  tenantConfig: Record<string, unknown> | null | undefined,
): string {
  if (
    tenantConfig &&
    typeof tenantConfig.defaultOgImage === "string" &&
    tenantConfig.defaultOgImage.length > 0
  ) {
    return tenantConfig.defaultOgImage;
  }
  return `${getSiteUrl()}/og-default.jpg`;
}
