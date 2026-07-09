# Contract: Page Metadata

## Applies to
All public pages: home (`/`), portafolio (`/portafolio`), detail (`/inmuebles/[slug]`), contacto (`/contacto`), sobre (`/sobre`)

## Metadata fields (every page)
- `title`: string (unique per page)
- `description`: string (unique per page, max ~160 chars)
- `alternates.canonical`: absolute URL
- `openGraph`: `{ type, title, description, url, siteName, locale, images }`
- `twitter`: `{ card: "summary_large_image", title, description, images }`
- `robots`: `{ index: true, follow: true }`

## Detail page specifics
- `title`: `seo_title` if present, else fallback determinista
- `description`: `seo_description` if present, else fallback determinista
- `openGraph.images`: cover image URL if present, else default OG image
- `canonical`: `{SITE_URL}/inmuebles/{slug}`

## JSON-LD (additional)
### Home page
- `@type`: `Organization`
- Fields: `name`, `url`, `logo`, `contactPoint` (from tenant config + contact_config)

### Detail page
- `@type`: `BreadcrumbList`
- `itemListElement`: 3 items (Home → Portafolio → Promotion name)
- Existing `RealEstateListing` (F021) preserved unchanged

## Fallback determinista (detail pages without seo_title/seo_description)
- Title: `"{Tipo} en {operacion} en {municipio} — {n_dormitorios} dormitorios | Domio"`
- Description: First 155 chars of `descripcion_general` block, or generic fallback
