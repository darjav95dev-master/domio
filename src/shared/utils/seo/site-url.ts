/**
 * Returns the public base URL of the site for use in canonical URLs,
 * sitemap generation, OG images, and robots.txt Sitemap directive.
 *
 * Reads `NEXT_PUBLIC_SITE_URL` from environment variables.
 * Falls back to `http://localhost:3000` in development.
 * Trailing slashes are stripped to ensure consistent URL formatting.
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    return "http://localhost:3000";
  }
  // Strip trailing slashes without regex to avoid ReDoS concerns
  let end = url.length;
  while (end > 0 && url[end - 1] === "/") {
    end--;
  }
  return url.slice(0, end || 1);
}
