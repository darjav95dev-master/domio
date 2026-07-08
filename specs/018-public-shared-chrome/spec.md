# Feature Specification: public-shared-chrome

**Feature Branch**: `feature/018-public-shared-chrome`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Nav (fixed, over-hero/glass on scroll), Footer (slate 4-col), skip-to-content, layout público base"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegación pública con Nav fijo y transicional (Priority: P1)

Un visitante público aterriza en cualquier página de Domio y ve el Nav fijo en la parte superior. Al cargar la página, el Nav está en modo `over-hero`: fondo transparente, texto blanco, diseñado para superponerse sobre el hero fotográfico. Al hacer scroll más de 40px, el Nav transiciona suavemente a modo `glass`: fondo parchment con blur (`rgba(251,248,243,.85)` + `backdrop-filter blur(20px)`), sombra sutil, y texto en color ink. El Nav muestra el logo Domio (Fraunces italic 20px), enlaces de navegación (Portafolio, Contacto, Sobre) con animación de subrayado (0→100% width en hover), y un CTA pill (bg ink, fg bone, padding 11px 22px, radius pill). En móvil (<768px), los enlaces se colapsan en un menú hamburguesa que abre un drawer lateral.

**Why this priority**: Sin el Nav, el visitante no puede navegar la web pública. Es el elemento de navegación principal y debe funcionar correctamente en todos los viewports y modos (over-hero/glass).

**Independent Test**: Se puede probar cargando cualquier página pública (/, /portafolio, /contacto) y verificando que el Nav aparece fijo en la parte superior, es transparente al cargar, y transiciona a glass al hacer scroll. En móvil, el botón hamburguesa abre el drawer con los enlaces.

**Acceptance Scenarios**:

1. **Given** un visitante en cualquier página pública, **When** la página carga, **Then** ve el Nav fijo en la parte superior con fondo transparente y texto blanco (modo over-hero).
2. **Given** un visitante en modo over-hero, **When** hace scroll más de 40px, **Then** el Nav transiciona suavemente a modo glass con fondo parchment blur, sombra, y texto en color ink.
3. **Given** un visitante en modo glass, **When** hace scroll hacia arriba hasta menos de 40px, **Then** el Nav transiciona de vuelta a modo over-hero.
4. **Given** un visitante en desktop (≥768px), **When** pasa el mouse sobre un enlace del Nav, **Then** el enlace muestra animación de subrayado (0→100% width).
5. **Given** un visitante en móvil (<768px), **When** hace clic en el botón hamburguesa, **Then** se abre un drawer lateral con los enlaces de navegación.
6. **Given** el Nav en cualquier modo, **When** se inspecciona con Lighthouse, **Then** la accesibilidad es ≥90 (focus-visible, aria-labels, navegación por teclado).

---

### User Story 2 - Footer institucional con 4 columnas (Priority: P1)

Un visitante público llega al final de cualquier página y ve el Footer con fondo slate (`bg-inverted` #2E2B27). El Footer muestra un tagline editorial en Fraunces italic con `em` en `warm-amber`, y 4 columnas de enlaces: (1) Domio (Sobre, Equipo, Contacto), (2) Portafolio (Catálogo, Destacados, Novedades), (3) Legal (Aviso Legal, Privacidad, Cookies), (4) Contacto (teléfono, email, dirección, horario). En la parte inferior, una fila legal con borde superior muestra el copyright y enlaces legales. El padding es `120px 56px 40px` en desktop, responsive en móvil.

**Why this priority**: Sin el Footer, la web pública carece de cierre institucional y enlaces de navegación secundarios. Es esencial para la coherencia del marco compartido.

**Independent Test**: Se puede probar navegando al final de cualquier página pública y verificando que el Footer aparece con fondo slate, tagline editorial, 4 columnas de enlaces, y fila legal.

**Acceptance Scenarios**:

1. **Given** un visitante en cualquier página pública, **When** llega al final de la página, **Then** ve el Footer con fondo slate (#2E2B27).
2. **Given** el Footer en desktop, **When** se inspecciona, **Then** muestra grid `1.6fr 1fr 1fr 1fr` con tagline editorial y 4 columnas de enlaces.
3. **Given** el Footer en móvil, **When** se inspecciona, **Then** las columnas se apilan verticalmente.
4. **Given** el Footer, **When** se inspecciona la fila legal, **Then** muestra borde superior y copyright.
5. **Given** el Footer, **When** se inspecciona con Lighthouse, **Then** la accesibilidad es ≥90 (contraste, estructura semántica).

---

### User Story 3 - Skip-to-content y layout base accesible (Priority: P2)

Un usuario que navega con teclado o lector de pantalla aterriza en cualquier página pública y puede usar el enlace "Skip to content" que aparece al recibir foco (tabulación). Al activar el enlace, el foco se mueve al `<main id="main-content">`, saltando el Nav y el Footer. El layout base incluye `<main id="main-content">` semántico y `<html style={{ colorScheme: 'light' }}>` sin dark mode.

**Why this priority**: La accesibilidad es un requisito no negociable (constitution.md §6). Skip-to-content es esencial para usuarios de teclado y lectores de pantalla.

**Independent Test**: Se puede probar navegando a cualquier página pública, presionando Tab hasta que aparezca el enlace "Skip to content", y verificando que al activarlo el foco se mueve al `<main>`.

**Acceptance Scenarios**:

1. **Given** un usuario navegando con teclado, **When** presiona Tab al cargar la página, **Then** aparece el enlace "Skip to content" visible solo al recibir foco.
2. **Given** el enlace "Skip to content" visible, **When** el usuario lo activa (Enter), **Then** el foco se mueve al `<main id="main-content">`.
3. **Given** el layout base, **When** se inspecciona el HTML, **Then** contiene `<main id="main-content">` semántico.
4. **Given** el layout base, **When** se inspecciona `<html>`, **Then** tiene `style={{ colorScheme: 'light' }}` sin dark mode.
5. **Given** el layout base, **When** se ejecuta Lighthouse Accessibility, **Then** el score es ≥90.

---

### Edge Cases

- ¿Qué ocurre si el usuario tiene `prefers-reduced-motion` activado? Las transiciones del Nav (over-hero → glass) deben respetar `prefers-reduced-motion` y ser instantáneas en lugar de suaves.
- ¿Qué ocurre si el usuario está en un viewport muy ancho (>1920px)? El Nav y el Footer deben mantenerse centrados con max-width y no expandirse indefinidamente.
- ¿Qué ocurre si la página no tiene hero fotográfico? El Nav en modo over-hero (transparente) puede tener bajo contraste sobre fondos claros. En este caso, el Nav debe detectar si hay hero y ajustar el modo inicial (si no hay hero, empezar en modo glass).
- ¿Qué ocurre si el usuario desactiva JavaScript? El Nav debe funcionar en modo glass por defecto (sin transición), ya que la detección de scroll requiere JS. El Footer y skip-to-content funcionan sin JS.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema debe renderizar el Nav fijo en la parte superior de todas las páginas bajo `app/(public)/` con `position: fixed` y `z-index: 100`.
- **FR-002**: El sistema debe mostrar el Nav en modo `over-hero` (fondo transparente, texto blanco) al cargar la página, y transicionar a modo `glass` (fondo parchment blur, texto ink) al superar 40px de scroll.
- **FR-003**: El sistema debe renderizar el logo Domio en el Nav con fuente Fraunces italic 20px.
- **FR-004**: El sistema debe mostrar enlaces de navegación (Portafolio, Contacto, Sobre) con animación de subrayado (0→100% width en hover).
- **FR-005**: El sistema debe mostrar un CTA pill en el Nav con bg ink, fg bone, padding 11px 22px, radius pill.
- **FR-006**: El sistema debe colapsar los enlaces del Nav en un menú hamburguesa en viewport <768px, con drawer lateral al hacer clic.
- **FR-007**: El sistema debe renderizar el Footer con fondo slate (`bg-inverted` #2E2B27) en todas las páginas bajo `app/(public)/`.
- **FR-008**: El sistema debe mostrar el Footer con grid `1.6fr 1fr 1fr 1fr` en desktop, tagline editorial Fraunces italic con `em` en `warm-amber`, y 4 columnas de enlaces.
- **FR-009**: El sistema debe mostrar una fila legal en el Footer con borde superior y copyright.
- **FR-010**: El sistema debe incluir un enlace "Skip to content" visible solo al recibir foco, que mueva el foco al `<main id="main-content">`.
- **FR-011**: El sistema debe incluir `<main id="main-content">` semántico en el layout base de `app/(public)/`.
- **FR-012**: El sistema debe respetar `prefers-reduced-motion` en las transiciones del Nav.
- **FR-013**: El sistema debe mantener el Nav y Footer centrados con max-width en viewports >1920px.
- **FR-014**: El sistema debe funcionar en modo glass por defecto si JavaScript está desactivado.

### Key Entities

- **Nav**: Componente compartido en `src/shared/components/Nav.tsx`. Estado: modo (`over-hero` | `glass`), scroll position. Props: ninguna (consume datos de navegación estáticos). Renderiza logo, enlaces, CTA, y hamburguesa en móvil.
- **Footer**: Componente compartido en `src/shared/components/Footer.tsx`. Props: ninguna (consume datos de contacto estáticos en esta feature; en F017 se integrará con `contact_config`). Renderiza tagline, 4 columnas de enlaces, y fila legal.
- **SkipToContent**: Componente compartido en `src/shared/components/SkipToContent.tsx`. Props: ninguna. Renderiza enlace visible solo al foco que mueve el foco al `<main>`.
- **PublicLayout**: Layout en `app/(public)/layout.tsx`. Orquesta Nav, SkipToContent, `<main>`, y Footer. No contiene lógica de negocio ni contexto de tenant.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El Nav y Footer se renderizan en el 100% de las páginas bajo `app/(public)/` (/, /portafolio, /contacto, /sobre).
- **SC-002**: La transición del Nav de over-hero a glass ocurre en <100ms al superar 40px de scroll (sin lag perceptible).
- **SC-003**: Lighthouse Accessibility ≥90 en el layout base (Nav + Footer + skip-to-content + main).
- **SC-004**: El Nav funciona correctamente en desktop (≥768px) y móvil (<768px) sin solapamientos ni desbordes.
- **SC-005**: El Footer muestra 4 columnas en desktop y se apila verticalmente en móvil sin cortar contenido.
- **SC-006**: Skip-to-content es funcional: al presionar Tab y activar el enlace, el foco se mueve al `<main>` en <50ms.
- **SC-007**: Las transiciones del Nav respetan `prefers-reduced-motion` (instantáneas si está activado).
- **SC-008**: El layout base no contiene lógica de negocio ni contexto de tenant (verificable inspeccionando el código).

## Assumptions

- Los enlaces de navegación del Nav y Footer son estáticos en esta feature (no se leen de `content_blocks` ni `contact_config`). La integración con contenidos globales se hará en F017/F023.
- El Nav detecta si la página tiene hero fotográfico para ajustar el modo inicial (over-hero si hay hero, glass si no hay hero). En esta feature, se asume que todas las páginas tienen hero o se usa glass por defecto.
- No hay dark mode. El `<html>` ya tiene `colorScheme: 'light'` y no se modifica.
- Los iconos del Nav (hamburguesa, enlaces) usan `@phosphor-icons/react` instalado en F003.
- El Nav y Footer son componentes de `src/shared/components/` porque los usa toda la superficie pública (Scope Rule).
- No hay badge de leads en el Nav (eso es del backoffice, F010).
- El contenido del Footer (teléfono, email, dirección) es placeholder en esta feature. La integración con `contact_config` se hará en F017.
- Las transiciones del Nav usan CSS transitions con `prefers-reduced-motion` media query.
- El drawer del Nav en móvil usa `position: fixed` con overlay y animación de slide-in.
- El layout base no incluye auth guard ni verificación de rol (eso es solo para backoffice).
