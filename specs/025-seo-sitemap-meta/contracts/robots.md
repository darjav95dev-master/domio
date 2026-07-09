# Contract: robots.txt

## Endpoint
`GET /robots.txt`

## Response
- **Status**: 200
- **Content-Type**: `text/plain`

## Body
```
User-agent: *
Allow: /
Disallow: /panel
Disallow: /api

Sitemap: https://domio.com/sitemap.xml
```

## Rules
- `Allow: /` permits all public routes
- `Disallow: /panel` blocks backoffice (complements `X-Robots-Tag: noindex` from middleware)
- `Disallow: /api` blocks all API routes (internal and public)
- `Sitemap:` directive uses `NEXT_PUBLIC_SITE_URL` env var
- `host:` directive uses `NEXT_PUBLIC_SITE_URL` env var
