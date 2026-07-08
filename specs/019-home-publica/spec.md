# Feature Specification: home-publica

**Feature Branch**: `feature/019-home-publica`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Home completa SSR con 9 bloques: hero+TrustCard, cómo-trabajamos grid, sobre-Domio compare, portafolio destacado, métricas+testimonios, CTA band, FAQ accordion"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Home SSR con 9 bloques editoriales (Priority: P1)

Un visitante público aterriza en la home de Domio (`/`) y ve una página SSR completa con 9 bloques en orden vertical: (1) Hero full-bleed 100vh con overlay multicapa, grid `1.4fr 1fr` (copy + TrustCard), trust-marquee band; (2) Cómo trabajamos — grid 4-col con gap 1px, numeral italic 52px + icono + título + cuerpo; (3) Sobre Domio — split `1fr 1.05fr` con fotografía arquitectónica + tabla comparativa; (4) Portafolio destacado — grid `1.3fr 1fr 1fr` con 3 PropertyCards (1 featured span 2) alimentado de `promociones` con `kind='portfolio'` y `status='PUBLISHED'`; (5) Confianza — fondo bone, métricas 4-col con numeral hero 72px + testimonios 3-col; (6) CTA final — full-bleed con fotografía, H2 display-lg, botón primary; (7) FAQ accordion — grid `1fr 1.2fr` con 6-8 preguntas; (8) Nav — ya implementado en F018; (9) Footer — ya implementado en F018. Los bloques 1, 3, 5, 6 y 7 leen su contenido de `content_blocks` (F017). El bloque 4 consulta el catálogo vía repositorio con `PublicContext`.

**Why this priority**: La home es la puerta de entrada a Domio, la página con mayor impacto en captación de leads y SEO. Debe ser completamente SSR/ISR y superar Lighthouse Performance ≥ 80 y Accessibility ≥ 90.

**Independent Test**: Se puede probar navegando a `/` y verificando que los 9 bloques están presentes, renderizados con datos reales, y que Lighthouse cumple los umbrales.

**Acceptance Scenarios**:

1. **Given** un visitante en `/`, **When** la página carga, **Then** ve los 9 bloques en orden vertical según design.md §13.1.
2. **Given** la home, **When** se inspecciona el HTML, **Then** está renderizada SSR (no client-side).
3. **Given** la home, **When** se ejecuta Lighthouse Performance, **Then** el score es ≥80.
4. **Given** la home, **When** se ejecuta Lighthouse Accessibility, **Then** el score es ≥90.
5. **Given** la home, **When** se inspecciona visualmente, **Then** no hay imágenes rotas ni cajas negras.
6. **Given** la home, **When** el usuario tiene `prefers-reduced-motion` activado, **Then** las animaciones son instantáneas.

---

### User Story 2 - Scroll-reveal y motion (Priority: P2)

Un visitante público navega la home y experimenta scroll-reveal con stagger 80ms en los bloques, lift on hover en PropertyCards, y FAQ accordion animado. Todo motion respeta `prefers-reduced-motion`.

**Why this priority**: El motion mejora la experiencia visual pero no es crítico para la funcionalidad. Debe respetar `prefers-reduced-motion`.

**Independent Test**: Se puede probar navegando la home y verificando que los bloques aparecen con scroll-reveal, las PropertyCards tienen lift on hover, y el FAQ accordion se anima. Con `prefers-reduced-motion` activado, las animaciones son instantáneas.

**Acceptance Scenarios**:

1. **Given** un visitante en la home, **When** hace scroll, **Then** los bloques aparecen con scroll-reveal stagger 80ms.
2. **Given** una PropertyCard, **When** el usuario pasa el mouse, **Then** la card tiene lift on hover.
3. **Given** el FAQ accordion, **When** el usuario hace clic en una pregunta, **Then** la respuesta se expande con animación.
4. **Given** un usuario con `prefers-reduced-motion` activado, **When** navega la home, **Then** todas las animaciones son instantáneas.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema debe renderizar la home SSR con 9 bloques en orden vertical según design.md §13.1.
- **FR-002**: El sistema debe leer los bloques 1, 3, 5, 6 y 7 de `content_blocks` con `page_key='home'`.
- **FR-003**: El sistema debe consultar promociones con `kind='portfolio'` y `status='PUBLISHED'` para el bloque 4 (Portafolio destacado).
- **FR-004**: El sistema debe renderizar Hero full-bleed 100vh con overlay multicapa, grid `1.4fr 1fr`, TrustCard, trust-marquee band.
- **FR-005**: El sistema debe renderizar Cómo trabajamos con grid 4-col, gap 1px, numeral italic 52px.
- **FR-006**: El sistema debe renderizar Sobre Domio con split `1fr 1.05fr`, fotografía + tabla comparativa.
- **FR-007**: El sistema debe renderizar Portafolio destacado con grid `1.3fr 1fr 1fr`, 3 PropertyCards (1 featured span 2).
- **FR-008**: El sistema debe renderizar Confianza con fondo bone, métricas 4-col, testimonios 3-col.
- **FR-009**: El sistema debe renderizar CTA final full-bleed con fotografía, H2 display-lg, botón primary.
- **FR-010**: El sistema debe renderizar FAQ accordion con grid `1fr 1.2fr`, 6-8 preguntas.
- **FR-011**: El sistema debe implementar scroll-reveal con stagger 80ms.
- **FR-012**: El sistema debe implementar lift on hover en PropertyCards.
- **FR-013**: El sistema debe implementar FAQ accordion animado.
- **FR-014**: El sistema debe respetar `prefers-reduced-motion` en toda animación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Lighthouse Performance ≥80 en la home.
- **SC-002**: Lighthouse Accessibility ≥90 en la home.
- **SC-003**: Los 9 bloques están presentes y visualmente correctos según design.md §13.1.
- **SC-004**: No hay imágenes rotas ni cajas negras.
- **SC-005**: Scroll-reveal funcional con stagger 80ms.
- **SC-006**: `prefers-reduced-motion` detiene animaciones.
- **SC-007**: Navegación por teclado completa sobre FAQ accordion y CTA.

## Assumptions

- Los datos de `content_blocks` con `page_key='home'` ya existen (seed de F017).
- Las promociones `kind='portfolio'` y `status='PUBLISHED'` ya existen (seed de F011).
- Nav y Footer ya están implementados en F018 y se integran vía layout.
- No se crean nuevas tablas ni migraciones.
- No hay lógica de leads ni formularios en la home.
- Datos estructurados schema.org son de F025.
