import { mediaEnv } from "./env";

/**
 * Resolves a media asset's r2Key to a public URL.
 *
 * Lightweight standalone helper (no AWS SDK import) so public Server Components
 * — catalog grid, home cards — can build image URLs without pulling the full
 * MediaService into their bundle.
 *
 * Three cases:
 * - Absolute URL (e.g. seeded Unsplash demo photo) → returned as-is.
 * - Local public asset ("/placeholder/x.jpg")        → returned as-is.
 * - R2 key (UUID-based, uploaded via the backoffice) → prefixed with R2_PUBLIC_URL.
 */
export function getPublicMediaUrl(r2Key: string): string {
  if (r2Key.startsWith("http://") || r2Key.startsWith("https://")) return r2Key;
  if (r2Key.startsWith("/")) return r2Key;
  return `${mediaEnv.R2_PUBLIC_URL}/${r2Key}`;
}
