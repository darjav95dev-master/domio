import { getSiteUrl } from "@/shared/utils/seo/site-url";
import {
  SITEMAP_CHANGE_FREQ,
  SITEMAP_LIMITS,
} from "@/shared/utils/seo/constants";
import { PromocionRepository } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single URL entry in the sitemap. */
export interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
}

// ---------------------------------------------------------------------------
// Sitemap URL builder
// ---------------------------------------------------------------------------

/**
 * Fetches all published promotions via the given repository and returns
 * sitemap URL entries with:
 *
 * - `loc`: absolute URL of the detail page (`{siteUrl}/inmuebles/{slug}`)
 * - `lastmod`: promotion's `updated_at` in YYYY-MM-DD format
 * - `changefreq`: weekly (per spec, detail pages use weekly frequency)
 *
 * @param repo - A `PromocionRepository` instance (allows DI for testing).
 *               In production, pass `new PromocionRepository(new PublicContext())`.
 */
export async function buildSitemapUrls(
  repo: PromocionRepository,
): Promise<SitemapEntry[]> {
  const result = await repo.findPublicWithCursor(
    {},
    { limit: SITEMAP_LIMITS.MAX_URLS_PER_RESPONSE },
  );

  const siteUrl = getSiteUrl();

  return result.items.map((promo) => ({
    loc: `${siteUrl}/inmuebles/${promo.slug}`,
    lastmod: formatDate(promo.updatedAt),
    changefreq: SITEMAP_CHANGE_FREQ.DETAIL,
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a Date to YYYY-MM-DD for sitemap lastmod.
 */
function formatDate(date: Date): string {
  const iso = date.toISOString();
  // "2026-07-08T12:00:00.000Z" → "2026-07-08"
  return iso.split("T")[0]!;
}
