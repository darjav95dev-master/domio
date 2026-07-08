# Tasks: detalle-inmueble-core

**Input**: Design documents from `/specs/021-detalle-inmueble-core/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: TDD obligatorio según constitution.md §3. Tests para lógica de negocio (server) y componentes UI.

**Organization**: Tasks grouped by user story. US1 (P1) es MVP, US2 (P2) es refinamiento SEO.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Instalar dependencias y crear estructura de directorios para la feature.

- [ ] T001 Instalar maplibre-gl como dependencia en package.json
- [ ] T002 Crear estructura de directorios src/features/detail/components/ y src/features/detail/server/
- [ ] T003 Crear directorio app/(public)/inmuebles/[slug]/

---

## Phase 2: Foundational (Server Data Layer)

**Purpose**: Función de servidor que obtiene todos los datos de la ficha desde el repositorio con PublicContext.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Implementar getPromocionBySlug en src/features/detail/server/get-detail-data.ts que obtenga promoción completa (con tipologías, unidades, bloques editoriales, media_assets) filtrando por status='PUBLISHED' y respetando PublicContext.
- [ ] T005 Implementar fallback SEO determinista en src/features/detail/server/get-detail-data.ts: si seo_title vacío → "{tipo} en {operacion} en {zona} — {n_dormitorios} dormitorios | Domio"; si seo_description vacío → resumen 155 chars desde descripción.
- [ ] T006 Implementar generación de datos estructurados RealEstateListing (JSON-LD) en src/features/detail/server/get-detail-data.ts desde bloques editoriales tipificados.

**Checkpoint**: Data layer lista. getPromocionBySlug devuelve datos completos con SEO fallback y structured data.

---

## Phase 3: User Story 1 - Ficha de detalle con bloques editoriales y mapa (Priority: P1) 🎯 MVP

**Goal**: Página de ficha SSR/ISR con detail hero, infobar, bloques editoriales, tabla de tipologías, mapa con privacidad, y SEO meta.

**Independent Test**: Navegar a `/inmuebles/[slug]` con slug válido PUBLISHED → ficha completa con todos los bloques, mapa respeta privacidad, SEO meta tags presentes.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Crear página app/(public)/inmuebles/[slug]/page.tsx con generateMetadata (title, description, OG, Twitter Cards, canonical) y renderizado SSR.
- [ ] T008 [P] [US1] Crear componente DetailHero en src/features/detail/components/DetailHero.tsx: 520px fixed height, fotografía exterior con overlay cálido, badges LIVE/HOT, H1 display-md, pills de tipo/operación/estado.
- [ ] T009 [P] [US1] Crear componente InfoBar en src/features/detail/components/InfoBar.tsx: 4-col grid (bg.surface, border-right dividers) con valores en numeral-lg (Fraunces italic 32px): precio/m², superficie, dormitorios, entrega.
- [ ] T010 [US1] Crear componente EditorialBlocks en src/features/detail/components/EditorialBlocks.tsx: itera sobre bloques y delega en sub-componentes por block_type.
- [ ] T011 [P] [US1] Crear sub-componente BlockDescripcion en src/features/detail/components/BlockDescripcion.tsx: prosa con formato limitado (negrita, cursiva, listas).
- [ ] T012 [P] [US1] Crear sub-componente BlockCalidades en src/features/detail/components/BlockCalidades.tsx: grid 4×2 con icono terracota + título Fraunces + descripción.
- [ ] T013 [P] [US1] Crear sub-componente BlockZonasComunes en src/features/detail/components/BlockZonasComunes.tsx: lista de ítems (nombre + descripción). Solo renderiza si kind='portfolio'.
- [ ] T014 [P] [US1] Crear sub-componente BlockUbicacion en src/features/detail/components/BlockUbicacion.tsx: lista de distancias (servicio + distancia).
- [ ] T015 [P] [US1] Crear sub-componente BlockPlazos en src/features/detail/components/BlockPlazos.tsx: timeline de 4 hitos (dot ink done / dot terracota next, línea conectora). Solo renderiza si kind='portfolio'.
- [ ] T016 [US1] Crear componente TypologyTable en src/features/detail/components/TypologyTable.tsx: columnas nombre, superficie, dormitorios, baños, precio, estado. Planos en columna separada con MediaImage (kind='PLAN').
- [ ] T017 [US1] Crear componente MapPromocion en src/features/detail/components/MapPromocion.tsx: Client Component con maplibre-gl + tiles OSM. Respeta map_privacy_mode: EXACT → punto en coordenadas reales, AREA → círculo aproximado desde location_approx. NUNCA expone coordenadas exactas en HTML/props si AREA.
- [ ] T018 [US1] Integrar todos los componentes en app/(public)/inmuebles/[slug]/page.tsx: DetailHero → InfoBar → EditorialBlocks → TypologyTable → MapPromocion. Incluir JSON-LD de datos estructurados.
- [ ] T019 [US1] Verificar revalidación ISR: al guardar en backoffice, disparar revalidateTag('promocion:{slug}') y revalidateTag('catalog').

**Checkpoint**: Ficha completa funcional con todos los bloques, mapa con privacidad, SEO meta, structured data, ISR.

---

## Phase 4: User Story 2 - Fallback SEO determinista (Priority: P2)

**Goal**: Cuando seo_title/seo_description están vacíos, el fallback se calcula deterministamente.

**Independent Test**: Abrir promoción sin seo_title → verificar que meta title sigue patrón "{tipo} en {operacion} en {zona} — {n_dormitorios} dormitorios | Domio".

### Implementation for User Story 2

- [ ] T020 [US2] Verificar que el fallback SEO en get-detail-data.ts (implementado en T005) funciona correctamente con promoción sin seo_title ni seo_description. Escribir test unitario para el fallback.

**Checkpoint**: Fallback SEO verificado con test.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales y validación final.

- [ ] T021 Verificar Lighthouse Performance ≥80 y Accessibility ≥90 en /inmuebles/[slug].
- [ ] T022 Verificar que coordenadas exactas NO aparecen en HTML cuando map_privacy_mode='AREA' (curl + inspección).
- [ ] T023 Verificar que datos estructurados RealEstateListing son válidos (Google Rich Results Test o validación manual del JSON-LD).
- [ ] T024 Verificar que toda imagen tiene fallback robusto (sin cajas negras) con datos reales del seed.
- [ ] T025 Ejecutar quickstart.md validation scenarios.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on Foundational (puede ir en paralelo con US1 pero es P2)
- **Polish (Phase 5)**: Depends on US1 y US2

### Within Each Phase

- T004 → T005 → T006 (secuencial, misma archivo)
- T007, T008, T009 en paralelo (archivos distintos)
- T011-T015 en paralelo (sub-componentes independientes)
- T010 depende de T011-T015 (EditorialBlocks los orquesta)
- T018 depende de T007-T017 (integración final)

### Parallel Opportunities

- T001, T002, T003 en paralelo
- T008, T009 en paralelo con T007
- T011, T012, T013, T014, T015 en paralelo
- T016 y T017 en paralelo

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001-T003)
2. Phase 2: Foundational (T004-T006)
3. Phase 3: US1 (T007-T019)
4. **STOP and VALIDATE**: Ficha completa funcional
5. Phase 4: US2 (T020) — refinamiento SEO
6. Phase 5: Polish (T021-T025)

### Incremental Delivery

1. Setup + Foundational → Data layer ready
2. US1 → Ficha completa → MVP!
3. US2 → Fallback SEO verificado
4. Polish → Lighthouse, privacidad, structured data validados

---

## Notes

- maplibre-gl se instala en T001 (no es dependencia de F003 porque architecture.md §1 lo lista como IMP-2 específico de F021).
- El componente MapPromocion es Client Component ('use client') porque maplibre-gl necesita interactividad.
- Los sub-componentes de bloques editoriales son Server Components (renderizado SSR).
- El fallback SEO es función pura (testable sin UI).
- ISR se dispara desde el backoffice (F011 ya tiene revalidateTag). En esta feature solo se asegura que las tags son correctas.
