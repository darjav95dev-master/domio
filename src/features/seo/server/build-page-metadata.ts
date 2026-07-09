import type { Metadata } from "next";
import { getSiteUrl } from "@/shared/utils/seo/site-url";
import { resolveDefaultOgImage } from "@/shared/utils/seo/default-og-image";
import { DEFAULT_META } from "@/shared/utils/seo/constants";
import { getOrganizationData } from "./get-organization-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Valid Open Graph type values (subset of the full Next.js OpenGraph type). */
export type OgType =
  | "website"
  | "article"
  | "book"
  | "profile"
  | "music.song"
  | "music.album"
  | "music.playlist"
  | "music.radio_station"
  | "video.movie"
  | "video.episode"
  | "video.tv_show"
  | "video.other";

export interface PageMetadataInput {
  /** Page title (used for <title>, OG title, Twitter title). */
  title: string;
  /** Page description (used for meta description, OG description, Twitter description). */
  description: string;
  /** Path component of the URL, e.g. "/", "/portafolio", "/inmuebles/slug". */
  path: string;
  /**
   * Absolute URL of the OG image.
   * If omitted, the default tenant OG image is resolved via `resolveDefaultOgImage()`.
   */
  ogImage?: string;
  /**
   * Open Graph type. Defaults to "website".
   */
  ogType?: OgType;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Builds a standard Next.js `Metadata` object for a public page.
 *
 * All public pages share the same structure:
 * - `title`, `description`
 * - `alternates.canonical` — absolute URL built from `getSiteUrl()` + `path`
 * - `openGraph` — type (default "website"), title, description, url, siteName,
 *   locale ("es_ES"), images (provided or default)
 * - `twitter` — card "summary_large_image", title, description, images
 * - `robots` — index: true, follow: true
 *
 * @param input - Page-specific metadata values.
 * @returns A `Metadata` object ready to return from `generateMetadata()`.
 */
export async function buildPageMetadata(
  input: PageMetadataInput,
): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}${input.path}`;

  // Fetch tenant config for default OG image fallback
  const { tenant } = await getOrganizationData();

  // Resolve OG image: use provided image or fall back to tenant default
  const ogImage =
    input.ogImage && input.ogImage.length > 0
      ? input.ogImage
      : resolveDefaultOgImage(tenant?.config ?? null);

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: input.ogType ?? "website",
      title: input.title,
      description: input.description,
      url: pageUrl,
      siteName: DEFAULT_META.SITE_NAME,
      locale: "es_ES",
      images: [ogImage],
    },
    twitter: {
      card: DEFAULT_META.TWITTER_CARD,
      title: input.title,
      description: input.description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
