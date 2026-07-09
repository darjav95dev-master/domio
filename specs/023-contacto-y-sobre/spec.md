# Feature Specification: contacto-y-sobre

**Feature Branch**: `feature/023-contacto-y-sobre`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Páginas /contacto (formulario + quick-band + mapa) y /sobre (contenido desde bloques globales)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Página de contacto (Priority: P1)

Un visitante accede a `/contacto` y ve: header centrado (padding-top 140px) con eyebrow + H1 + lead, quick-band 4-col con datos de contact_config (teléfono, email, dirección, horario), main grid 1.4fr 1fr con formulario de contacto genérico (izquierda) + mapa con ubicación de oficina + datos de contacto (derecha). Footer integrado.

**Acceptance Scenarios**:
1. **Given** un visitante en `/contacto`, **When** carga, **Then** ve header, quick-band, formulario y mapa.
2. **Given** el formulario, **When** se envía con datos válidos, **Then** crea lead genérico o envía a contact_config.email.
3. **Given** la página, **When** se inspecciona Lighthouse, **Then** Accessibility ≥90.

### User Story 2 - Página sobre Domio (Priority: P2)

Un visitante accede a `/sobre` y ve contenido editorial desde content_blocks con page_key='about'. Layout editorial con fotografía arquitectónica.

**Acceptance Scenarios**:
1. **Given** un visitante en `/sobre`, **When** carga, **Then** ve contenido editorial desde content_blocks.
2. **Given** la página, **When** se inspecciona, **Then** layout editorial con fotografía.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema debe renderizar `/contacto` SSR con header, quick-band, formulario y mapa.
- **FR-002**: El sistema debe mostrar datos de contact_config en quick-band (teléfono, email, dirección, horario).
- **FR-003**: El sistema debe renderizar formulario de contacto genérico (no vinculado a promoción).
- **FR-004**: El sistema debe mostrar mapa con ubicación de oficina (maplibre-gl).
- **FR-005**: El sistema debe renderizar `/sobre` SSR con contenido desde content_blocks (page_key='about').
- **FR-006**: El sistema debe usar layout editorial con fotografía para /sobre.
- **FR-007**: El sistema debe integrar Nav y Footer (F018) en ambas páginas.
- **FR-008**: El sistema debe garantizar accesibilidad WCAG AA.

## Success Criteria *(mandatory)*

- **SC-001**: Ambas páginas renderizan con datos reales.
- **SC-002**: Formulario de contacto funcional.
- **SC-003**: Quick-band muestra datos de contact_config.
- **SC-004**: Mapa muestra ubicación de oficina.
- **SC-005**: /sobre muestra contenido editorial desde content_blocks.
- **SC-006**: Lighthouse Accessibility ≥90 en ambas páginas.

## Assumptions

- contact_config (F017) tiene teléfono, email, dirección, horario, coordenadas de oficina.
- content_blocks (F017) tiene entradas con page_key='about'.
- maplibre-gl ya instalado (F021).
- Nav y Footer (F018) disponibles.

## Out of Scope

- Formulario de contacto vinculado a promoción (eso es F022).
- Contenido estático hardcodeado (todo desde content_blocks).
