# Feature Specification: portafolio-catalogo

**Feature Branch**: `feature/020-portafolio-catalogo`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Catálogo público SSR: filter bar, grid 3-col de PropertyCards, cursor pagination, empty state compuesto, URL compartible con filtros"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Catálogo público SSR con filtros y paginación (Priority: P1)

Un visitante público accede a `/portafolio` y ve una página SSR con header band (H1 "Portafolio" + lead), filter bar sticky con controles para isla, municipio, tipo, operación, precio, dormitorios, baños, amenities, estado de obra. Los filtros activos aparecen como chips. El grid muestra PropertyCards en 3-col (desktop), 2-col (tablet), 1-col (móvil). La paginación es por cursor. La URL se actualiza con los filtros (compartible). Al no haber resultados, se muestra empty state compuesto.

**Why this priority**: El catálogo es la segunda superficie más crítica después de la home. Es donde el visitante descubre el portafolio y aplica filtros.

**Independent Test**: Navegar a `/portafolio`, aplicar filtros, verificar que la URL cambia, el grid se actualiza, y la paginación funciona.

**Acceptance Scenarios**:

1. **Given** un visitante en `/portafolio`, **When** la página carga, **Then** ve header band, filter bar, y grid de PropertyCards con promociones PUBLISHED.
2. **Given** un visitante aplicando filtros, **When** selecciona filtros, **Then** la URL se actualiza con searchParams y el grid muestra resultados filtrados.
3. **Given** un visitante con filtros activos, **When** hace clic en "Clear", **Then** los filtros se limpian y el grid muestra todas las promociones.
4. **Given** un visitante sin resultados, **When** los filtros no coinciden, **Then** se muestra empty state compuesto.
5. **Given** un visitante paginando, **When** hace clic en "Siguiente", **Then** se cargan los siguientes lotes sin duplicados.
6. **Given** la página, **When** se inspecciona Lighthouse, **Then** Accessibility ≥90 y Performance ≥80.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema debe renderizar `/portafolio` SSR con datos reales.
- **FR-002**: El sistema debe mostrar filter bar sticky con controles para todos los filtros.
- **FR-003**: El sistema debe actualizar la URL con searchParams al aplicar filtros.
- **FR-004**: El sistema debe mostrar filtros activos como chips con bg accent.subtle.
- **FR-005**: El sistema debe renderizar grid responsive de PropertyCards (3→2→1 col).
- **FR-006**: El sistema debe implementar paginación por cursor (no offset).
- **FR-007**: El sistema debe mostrar empty state compuesto al no haber resultados.
- **FR-008**: El sistema debe anunciar result count vía aria-live="polite".
- **FR-009**: El sistema debe mostrar skeleton con 12 PropertyCards placeholder durante carga.
- **FR-010**: El sistema debe garantizar que solo promociones PUBLISHED son visibles (PublicContext).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Lighthouse Accessibility ≥90 en `/portafolio`.
- **SC-002**: Lighthouse Performance ≥80 en `/portafolio`.
- **SC-003**: Filtros modifican la URL y el grid se actualiza correctamente.
- **SC-004**: Cursor pagination funciona sin duplicados ni saltos.
- **SC-005**: Empty state compuesto se muestra al no haber resultados.
- **SC-006**: Grid es responsive (3→2→1 columnas).
- **SC-007**: Solo promociones PUBLISHED son visibles.

## Assumptions

- PromocionRepository tiene método para cursor pagination o se añade en esta feature.
- PublicContext garantiza status='PUBLISHED' a nivel de repositorio.
- PropertyCard es un componente nuevo en src/features/catalog/ (no reusa el de la home).
- Seed data tiene promociones PUBLISHED para mostrar.
