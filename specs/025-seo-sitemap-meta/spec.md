# Feature Specification: seo-sitemap-meta

**Feature Branch**: `feature/025-seo-sitemap-meta`

**Created**: 2026-07-09

**Status**: Draft

**Input**: User description: "Sitemap XML autogenerado (solo PUBLISHED), robots.txt diferenciado (público vs panel), canonical URLs, Open Graph + Twitter Cards, meta tags con fallback determinista"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sitemap XML autogenerado (Priority: P1)

Un motor de búsqueda (Googlebot, Bingbot) accede a `/sitemap.xml`. El sistema genera dinámicamente un sitemap XML incluyendo home (`/`), portafolio (`/portafolio`), todas las fichas de detalle de promociones con `status='PUBLISHED'` (tanto portfolio como external, ya que ambas son visibles en la superficie pública), contacto (`/contacto`) y sobre (`/sobre`). Cada entrada incluye `lastmod` desde `updated_at` de la promoción o página, y frecuencia diferenciada: `daily` para portafolio, `weekly` para fichas de detalle, `monthly` para páginas estáticas (home, contacto, sobre). La consulta al catálogo se realiza vía `PublicContext` (solo ve `status='PUBLISHED'`), reutilizando el patrón de repositorio context-aware con `SET LOCAL` en transacción.

**Why this priority**: Sin sitemap XML, los motores de búsqueda no descubren eficientemente todas las páginas indexables de la plataforma, reduciendo el alcance del SEO orgánico.

**Independent Test**: Acceder a `/sitemap.xml` → 200 con XML válido. Verificar que incluye home, portafolio, fichas PUBLISHED, contacto, sobre. Verificar que NO incluye fichas de promociones DRAFT/RESERVED/SOLD. Verificar `lastmod` y `changefreq` correctos.

**Acceptance Scenarios**:

1. **Given** un motor de búsqueda, **When** accede a `/sitemap.xml`, **Then** retorna 200 con XML válido conforme al esquema sitemap.org.
2. **Given** promociones PUBLISHED en el catálogo, **When** se genera el sitemap, **Then** cada ficha aparece como `<url>` con `loc`, `lastmod`, `changefreq=weekly`.
3. **Given** promociones con status DRAFT/RESERVED/SOLD, **When** se genera el sitemap, **Then** NO aparecen en el sitemap.
4. **Given** la página de portafolio, **When** se incluye en el sitemap, **Then** tiene `changefreq=daily`.
5. **Given** las páginas estáticas (home, contacto, sobre), **When** se incluyen en el sitemap, **Then** tienen `changefreq=monthly`.
6. **Given** una promoción con `updated_at` reciente, **When** se genera el sitemap, **Then** el `lastmod` refleja esa fecha.

### User Story 2 - Robots.txt diferenciado (Priority: P1)

Un motor de búsqueda accede a `/robots.txt`. El sistema retorna un robots.txt que permite indexar todas las rutas públicas (`/`, `/portafolio`, `/inmuebles/*`, `/contacto`, `/sobre`), bloquea `/panel/*` (backoffice) y `/api/*`, e incluye referencia al sitemap (`Sitemap: https://domio.com/sitemap.xml`). El backoffice ya tiene `X-Robots-Tag: noindex` inyectado por middleware (F005), el robots.txt complementa esa protección a nivel de descubrimiento.

**Why this priority**: Sin robots.txt correcto, los motores de búsqueda podrían intentar indexar rutas del backoffice o de API interna, exponiendo información sensible en los resultados de búsqueda.

**Independent Test**: Acceder a `/robots.txt` → 200 con contenido correcto. Verificar que permite `/` y bloquea `/panel` y `/api`. Verificar que incluye `Sitemap:` directive.

**Acceptance Scenarios**:

1. **Given** un motor de búsqueda, **When** accede a `/robots.txt`, **Then** retorna 200 con texto plano válido.
2. **Given** el robots.txt, **When** se inspecciona, **Then** contiene `User-agent: *` con `Allow: /` y `Disallow: /panel` y `Disallow: /api`.
3. **Given** el robots.txt, **When** se inspecciona, **Then** contiene línea `Sitemap: https://domio.com/sitemap.xml`.
4. **Given** la variable `NEXT_PUBLIC_SITE_URL`, **When** se genera el robots.txt, **Then** la directiva Sitemap usa esa URL base.

### User Story 3 - Metadata API con Open Graph y Twitter Cards (Priority: P1)

Un usuario comparte una URL de Domio en redes sociales (WhatsApp, Twitter, LinkedIn). El sistema ha generado `generateMetadata` en cada página pública con `title`, `description`, `openGraph` (type, title, description, images, url) y `twitter` (card, title, description, images). Para fichas de detalle, la imagen OG es la portada de la promoción; si no hay portada, se usa imagen por defecto del tenant. Para páginas estáticas y listados, se usa imagen por defecto del tenant. El canonical URL se establece en cada página para evitar contenido duplicado.

**Why this priority**: Sin OG/Twitter Cards, las páginas compartidas en redes sociales muestran previews pobres o inexistentes, reduciendo el CTR y el tráfico orgánico.

**Independent Test**: Compartir URL de home → preview con título, descripción, imagen OG. Compartir URL de ficha → preview con imagen de portada. Verificar canonical URL en cada página.

**Acceptance Scenarios**:

1. **Given** la página home (`/`), **When** se genera metadata, **Then** incluye title, description, openGraph con type=website, twitter:card=summary_large_image.
2. **Given** una ficha de detalle con portada, **When** se genera metadata, **Then** openGraph.images incluye URL de la imagen de portada.
3. **Given** una ficha de detalle sin portada, **When** se genera metadata, **Then** openGraph.images incluye imagen por defecto del tenant.
4. **Given** una ficha con seo_title y seo_description, **When** se genera metadata, **Then** usa esos valores.
5. **Given** una ficha sin seo_title ni seo_description, **When** se genera metadata, **Then** aplica fallback determinista: "{tipo} en {operación} en {zona} — {n_dormitorios} dormitorios | Domio".
6. **Given** cualquier página pública, **When** se inspecciona el HTML, **Then** contiene `<link rel="canonical" href="...">` con URL absoluta.

### User Story 4 - Datos estructurados Organization y BreadcrumbList (Priority: P2)

Un motor de búsqueda rastrea la home y las fichas de detalle. En la home, encuentra datos estructurados `Organization` (schema.org) con nombre, logo, URL y datos de contacto del tenant (inyectados como JSON-LD). En cada ficha de detalle, encuentra `BreadcrumbList` (Domio → Portafolio → Nombre de la promoción) además del `RealEstateListing` ya existente (F021). Ambos se inyectan vía `<script type="application/ld+json">` en el `<head>`.

**Why this priority**: Los datos estructurados permiten rich snippets en resultados de búsqueda (knowledge panel para Organization, breadcrumbs para fichas), mejorando visibilidad y CTR.

**Independent Test**: Inspeccionar HTML de home → JSON-LD Organization válido. Inspeccionar HTML de ficha → JSON-LD BreadcrumbList + RealEstateListing válidos. Validar con Google Rich Results Test.

**Acceptance Scenarios**:

1. **Given** la página home, **When** se inspecciona el HTML, **Then** contiene `<script type="application/ld+json">` con datos estructurados `Organization` (name, url, logo, contactPoint).
2. **Given** una ficha de detalle, **When** se inspecciona el HTML, **Then** contiene JSON-LD `BreadcrumbList` con 3 items: Home → Portafolio → Nombre promoción.
3. **Given** una ficha de detalle, **When** se inspecciona el HTML, **Then** mantiene JSON-LD `RealEstateListing` existente (F021) sin cambios.
4. **Given** los datos estructurados, **When** se validan con Google Rich Results Test, **Then** Organization y BreadcrumbList son válidos.
5. **Given** una promoción con map_privacy_mode='AREA', **When** se genera RealEstateListing, **Then** no expone coordenadas exactas (ya implementado en F021, verificar que se mantiene).

### User Story 5 - Lighthouse audit (Priority: P2)

El equipo de Domio verifica que las páginas públicas cumplen los umbrales de calidad. Se ejecuta Lighthouse en home, portafolio y al menos 3 fichas de detalle. Performance ≥ 80 y Accessibility ≥ 90 en todas. Si hay desviaciones, se corrigen en esta feature (no se difieren).

**Why this priority**: Los umbrales de Lighthouse son obligatorios por constitución (§6 Accessibility, §8 Performance). Esta feature debe verificar y corregir cualquier desviación introducida por las features previas de superficie pública.

**Independent Test**: Ejecutar Lighthouse en home, portafolio y 3 fichas → Performance ≥ 80, Accessibility ≥ 90 en todas.

**Acceptance Scenarios**:

1. **Given** la página home, **When** se audita con Lighthouse, **Then** Performance ≥ 80 y Accessibility ≥ 90.
2. **Given** la página de portafolio, **When** se audita con Lighthouse, **Then** Performance ≥ 80 y Accessibility ≥ 90.
3. **Given** al menos 3 fichas de detalle, **When** se auditan con Lighthouse, **Then** Performance ≥ 80 y Accessibility ≥ 90 en cada una.
4. **Given** desviaciones encontradas, **When** se identifican, **Then** se corrigen dentro de esta feature.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema debe exponer `/sitemap.xml` generado dinámicamente vía `app/sitemap.ts` (Metadata API de Next.js).
- **FR-002**: El sitemap debe incluir home (`/`), portafolio (`/portafolio`), todas las fichas de promociones `PUBLISHED`, contacto (`/contacto`) y sobre (`/sobre`).
- **FR-003**: El sitemap debe consultar el catálogo vía `PublicContext` (solo `status='PUBLISHED'`), usando repositorio context-aware con `SET LOCAL`.
- **FR-004**: El sitemap debe incluir `lastmod` desde `updated_at` de cada promoción o página.
- **FR-005**: El sitemap debe asignar `changefreq`: `daily` para portafolio, `weekly` para fichas, `monthly` para páginas estáticas.
- **FR-006**: El sistema debe exponer `/robots.txt` generado dinámicamente vía `app/robots.ts`.
- **FR-007**: El robots.txt debe permitir indexar rutas públicas (`/`) y bloquear `/panel` y `/api`.
- **FR-008**: El robots.txt debe incluir directiva `Sitemap: {NEXT_PUBLIC_SITE_URL}/sitemap.xml`.
- **FR-009**: Cada página pública debe implementar `generateMetadata` con title, description, openGraph y twitter.
- **FR-010**: Las fichas de detalle deben usar `seo_title`/`seo_description` si existen, o fallback determinista si no.
- **FR-011**: El fallback determinista debe seguir el patrón: "{tipo} en {operación} en {zona} — {n_dormitorios} dormitorios | Domio".
- **FR-012**: Las fichas con portada deben usar esa imagen en openGraph.images; sin portada, imagen por defecto del tenant.
- **FR-013**: Cada página pública debe incluir `<link rel="canonical">` con URL absoluta.
- **FR-014**: La home debe inyectar JSON-LD `Organization` con name, url, logo, contactPoint del tenant.
- **FR-015**: Las fichas de detalle deben inyectar JSON-LD `BreadcrumbList` (Home → Portafolio → Nombre promoción).
- **FR-016**: Las fichas de detalle deben mantener JSON-LD `RealEstateListing` existente (F021) sin cambios.
- **FR-017**: Los datos estructurados deben respetar `map_privacy_mode`: si AREA, no exponer coordenadas exactas.
- **FR-018**: Lighthouse Performance ≥ 80 en home, portafolio y 3+ fichas de detalle.
- **FR-019**: Lighthouse Accessibility ≥ 90 en home, portafolio y 3+ fichas de detalle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/sitemap.xml` retorna XML válido con todas las páginas PUBLISHED indexables.
- **SC-002**: `/robots.txt` permite indexar público y bloquea backoffice y API.
- **SC-003**: Cada página pública tiene meta tags únicos con OG y Twitter Card.
- **SC-004**: Home inyecta JSON-LD `Organization` válido según Google Rich Results Test.
- **SC-005**: Fichas de detalle incluyen JSON-LD `BreadcrumbList` + `RealEstateListing` válidos.
- **SC-006**: Canonical URLs presentes en todas las páginas públicas.
- **SC-007**: Lighthouse Performance ≥ 80 en home, portafolio y 3+ fichas.
- **SC-008**: Lighthouse Accessibility ≥ 90 en home, portafolio y 3+ fichas.
- **SC-009**: Fallback determinista de metadata funcional para fichas sin seo_title/seo_description.

## Assumptions

- La variable de entorno `NEXT_PUBLIC_SITE_URL` está configurada y contiene la URL base del sitio (ej: `https://domio.com`).
- Las imágenes de portada de promociones son accesibles vía URL pública (signed URLs de R2 o transformaciones).
- El tenant por defecto tiene configurados nombre, logo y datos de contacto (seed data de F009).
- Las páginas de contacto y sobre ya tienen contenido desde `content_blocks` (F017).
- El `RealEstateListing` JSON-LD de F021 ya respeta `map_privacy_mode` y no requiere cambios.
- Las captaciones externas (`kind='external'`) también son visibles en la superficie pública y por tanto deben incluirse en el sitemap (según product.md §6.4).

## Scope Boundaries

**Incluido**:
- Sitemap XML dinámico con promociones PUBLISHED
- Robots.txt diferenciado público vs panel
- Metadata API (generateMetadata) en home, portafolio, contacto, sobre
- Open Graph y Twitter Cards en todas las páginas públicas
- Canonical URLs en todas las páginas públicas
- JSON-LD Organization en home
- JSON-LD BreadcrumbList en fichas de detalle
- Verificación y corrección de Lighthouse (Performance ≥ 80, Accessibility ≥ 90)

**Excluido**:
- hreflang o multi-idioma (product.md §7 "No es multi-idioma")
- Etiquetas `noindex` condicionales por promoción (feature futura)
- Datos estructurados `Product` o `FAQPage` (iteraciones posteriores)
- Integración con Google Search Console o Bing Webmaster Tools (configuración externa)
- Modificaciones al `RealEstateListing` existente en F021 (solo se añade BreadcrumbList)
