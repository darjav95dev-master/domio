# Feature Specification: detalle-inmueble-core

**Feature Branch**: `feature/021-detalle-inmueble-core`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Ficha pública SSR/ISR: photo hero, infobar 4-col, renderizado de bloques editoriales, tabla de tipologías, mapa con modo de privacidad (EXACT/AREA), SEO meta + datos estructurados RealEstateListing"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ficha de detalle de promoción con bloques editoriales y mapa (Priority: P1)

Un visitante público accede a `/inmuebles/[slug]` y ve una página SSR/ISR con: detail hero (520px, fotografía exterior con overlay cálido, badges LIVE/HOT, H1 display-md, pills de tipo/operación/estado), infobar 4-col (precio/m², superficie, dormitorios, entrega) con numerales Fraunces italic 32px, bloques editoriales renderizados desde `promocion_content_blocks` (descripción general, memoria de calidades en grid 4×2, zonas comunes solo si kind='portfolio', ubicación y servicios, plazos y garantías solo si kind='portfolio' con timeline de 4 hitos), tabla de tipologías (nombre, superficie, dormitorios, baños, precio, estado) con planos en columna separada, mapa con maplibre-gl que respeta map_privacy_mode (EXACT → punto en coordenadas reales, AREA → círculo aproximado), y SEO meta tags + datos estructurados RealEstateListing.

**Why this priority**: La ficha de detalle es la página de aterrizaje SEO más importante del producto. Aquí llega el tráfico desde buscadores y desde el catálogo. Es donde el visitante decide contactar.

**Independent Test**: Navegar a `/inmuebles/[slug]` con un slug válido de una promoción PUBLISHED. Verificar que todos los bloques renderizan con datos reales, el mapa respeta el modo de privacidad, y los meta tags SEO son correctos.

**Acceptance Scenarios**:

1. **Given** un visitante en `/inmuebles/[slug]`, **When** la página carga, **Then** ve detail hero con fotografía, overlay, badges, H1 y pills de tipo/operación/estado.
2. **Given** la ficha cargada, **When** se inspecciona la infobar, **Then** muestra 4 columnas con valores en numeral-lg (Fraunces italic 32px): precio/m², superficie, dormitorios, entrega.
3. **Given** una promoción kind='portfolio', **When** se renderizan los bloques editoriales, **Then** aparecen los 5 bloques: descripción, calidades, zonas comunes, ubicación, plazos.
4. **Given** una promoción kind='external', **When** se renderizan los bloques editoriales, **Then** solo aparecen descripción, calidades y ubicación (no zonas comunes ni plazos).
5. **Given** una promoción con map_privacy_mode='EXACT', **When** se renderiza el mapa, **Then** muestra un punto en las coordenadas reales de la promoción.
6. **Given** una promoción con map_privacy_mode='AREA', **When** se inspecciona el HTML servido, **Then** las coordenadas exactas NO aparecen en el HTML, ni en JSON embebido, ni en schema.org — solo location_approx.
7. **Given** la ficha cargada, **When** se inspeccionan los meta tags, **Then** title y description están presentes (desde seo_title/seo_description o fallback determinista).
8. **Given** la ficha cargada, **When** se valida con Google Rich Results Test, **Then** los datos estructurados RealEstateListing son válidos.
9. **Given** la tabla de tipologías, **When** se renderiza, **Then** muestra columnas nombre, superficie, dormitorios, baños, precio, estado con datos reales.
10. **Given** la ficha, **When** se inspecciona Lighthouse, **Then** Accessibility ≥90 y Performance ≥80.
11. **Given** un cambio en backoffice, **When** se dispara revalidateTag, **Then** la ficha se actualiza sin redeploy (ISR funcional).

### User Story 2 - Fallback SEO determinista (Priority: P2)

Cuando una promoción no tiene `seo_title` o `seo_description` configurados, el sistema genera un fallback determinista basado en tipo + operación + zona + dormitorios.

**Acceptance Scenarios**:

1. **Given** una promoción sin seo_title, **When** se genera el meta title, **Then** sigue el patrón "{tipo} en {operacion} en {zona} — {n_dormitorios} dormitorios | Domio".
2. **Given** una promoción con seo_title configurado, **When** se genera el meta title, **Then** usa el valor de seo_title sin fallback.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema debe renderizar `/inmuebles/[slug]` SSR con revalidación ISR.
- **FR-002**: El sistema debe mostrar detail hero de 520px con fotografía exterior, overlay cálido, badges LIVE/HOT, H1 display-md y pills de tipo/operación/estado.
- **FR-003**: El sistema debe mostrar infobar 4-col con valores en numeral-lg (Fraunces italic 32px): precio/m², superficie, dormitorios, entrega.
- **FR-004**: El sistema debe renderizar bloques editoriales desde `promocion_content_blocks` según su `block_type`.
- **FR-005**: El sistema debe renderizar bloque de descripción general con formato limitado (negrita, cursiva, listas).
- **FR-006**: El sistema debe renderizar bloque de memoria de calidades en grid 4×2 con icono terracota + título Fraunces + descripción.
- **FR-007**: El sistema debe renderizar bloque de zonas comunes SOLO si kind='portfolio'.
- **FR-008**: El sistema debe renderizar bloque de ubicación y servicios como lista de distancias.
- **FR-009**: El sistema debe renderizar bloque de plazos y garantías SOLO si kind='portfolio', con timeline de 4 hitos.
- **FR-010**: El sistema debe mostrar tabla de tipologías con columnas: nombre, superficie, dormitorios, baños, precio, estado.
- **FR-011**: El sistema debe renderizar planos en columna separada con MediaImage (kind='PLAN').
- **FR-012**: El sistema debe mostrar mapa con maplibre-gl + tiles OSM.
- **FR-013**: El sistema debe respetar map_privacy_mode en el mapa: EXACT → coordenadas reales, AREA → círculo aproximado desde location_approx.
- **FR-014**: El sistema NUNCA debe exponer coordenadas exactas en HTML, JSON embebido ni schema.org cuando map_privacy_mode='AREA'.
- **FR-015**: El sistema debe generar meta title y description desde seo_title/seo_description con fallback determinista.
- **FR-016**: El sistema debe generar datos estructurados RealEstateListing de schema.org desde bloques editoriales.
- **FR-017**: El sistema debe generar Open Graph y Twitter Cards con imagen de portada.
- **FR-018**: El sistema debe generar canonical URL con slug persistente.
- **FR-019**: El sistema debe garantizar que solo promociones PUBLISHED son accesibles (404 si no).
- **FR-020**: El sistema debe garantizar que toda imagen tiene fallback robusto (nunca caja negra).
- **FR-021**: El sistema debe disparar revalidación ISR al cambiar datos en backoffice.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Lighthouse Accessibility ≥90 en `/inmuebles/[slug]`.
- **SC-002**: Lighthouse Performance ≥80 en `/inmuebles/[slug]`.
- **SC-003**: Ficha renderiza todos los bloques con datos reales (sin placeholders).
- **SC-004**: Mapa respeta modo de privacidad — coordenadas exactas no aparecen en HTML cuando map_privacy_mode='AREA'.
- **SC-005**: SEO meta tags generados con fallback determinista funcional.
- **SC-006**: Datos estructurados RealEstateListing válidos según Google Rich Results Test.
- **SC-007**: Sin imágenes rotas ni cajas negras.
- **SC-008**: Revalidación ISR funcional: cambio en backoffice → ficha actualizada sin redeploy.
- **SC-009**: Slugs persistentes: la URL no cambia al renombrar la promoción.

## Assumptions

- PromocionRepository tiene métodos para obtener promoción por slug con tipologías, unidades, bloques editoriales y media_assets.
- PublicContext garantiza status='PUBLISHED' a nivel de repositorio.
- maplibre-gl está disponible como dependencia o se instala en esta feature.
- Seed data tiene promociones PUBLISHED con bloques editoriales y media_assets para verificar.
- MediaImage component ya existe (F003/F013) y soporta kind='PLAN'.
- Los bloques editoriales (F012) ya están implementados y accesibles vía repositorio.

## Out of Scope

- Formulario de contacto (F022).
- Botón WhatsApp (F022).
- Botón compartir (F022).
- Inmuebles relacionados (F022).
- Visor de galería a pantalla completa.
- Mapa interactivo con clic, street view o cálculo de rutas.
- Analytics o tracking de visitas.
