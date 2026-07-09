# Contract: sitemap.xml

## Endpoint
`GET /sitemap.xml`

## Response
- **Status**: 200
- **Content-Type**: `application/xml`
- **Body**: Valid XML conforming to sitemap.org schema

## Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://domio.com/</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>monthly</changefreq>
  </url>
  <url>
    <loc>https://domio.com/portafolio</loc>
    <lastmod>2026-07-09</lastmod>
    <changefreq>daily</changefreq>
  </url>
  <url>
    <loc>https://domio.com/inmuebles/{slug}</loc>
    <lastmod>{updated_at}</lastmod>
    <changefreq>weekly</changefreq>
  </url>
  <!-- ... more URLs ... -->
</urlset>
```

## Rules
- Only `status='PUBLISHED'` promotions included
- Both `kind='portfolio'` and `kind='external'` included (both are public-facing)
- `lastmod` from `updated_at` of promotion
- `changefreq`: `daily` for portafolio, `weekly` for fichas, `monthly` for static pages
- All URLs absolute using `NEXT_PUBLIC_SITE_URL`
