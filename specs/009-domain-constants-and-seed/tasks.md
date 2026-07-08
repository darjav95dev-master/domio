# Tasks: Domain Constants & Seed

**Input**: Design documents from `specs/009-domain-constants-and-seed/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Yes — spec.md (RF-6) y constitution.md (§3) requieren TDD para lógica de negocio. Los tests de constantes y schemas son parte integral de la feature.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Preparar dependencias y estructura de archivos

- [ ] T001 Añadir `bcryptjs` como devDependency y `@types/bcryptjs` en `package.json`
- [ ] T002 [P] Crear archivos vacíos: `src/shared/constants/domain-labels.ts`, `src/shared/constants/domain-config.ts`, `src/shared/types/promocion-schema.ts`, `src/shared/types/tipologia-schema.ts`, `src/shared/types/lead-schema.ts`, `src/shared/types/content-block-schema.ts`, `scripts/seed.ts`, `tests/unit/constants.test.ts`, `tests/unit/schemas.test.ts`

---

## Phase 2: Foundational — Constantes de dominio (US1)

**Purpose**: Labels de presentación y constantes de configuración que toda feature posterior consume

**Independent Test**: `pnpm vitest run tests/unit/constants.test.ts` pasa. `pnpm typecheck` sin errores.

### Implementation

- [ ] T003 [US1] Crear mapas de labels en `src/shared/constants/domain-labels.ts`: `PROPERTY_TYPE_LABELS`, `CONSTRUCTION_STATUS_LABELS`, `OPERATION_TYPE_LABELS`, `LEAD_STATUS_LABELS`, `PROMOTION_STATUS_LABELS`, `USER_ROLE_LABELS`, `AMENITY_LABELS`. Cada mapa es `Record<EnumValue, string>` con etiquetas en español. Importar tipos desde `./db-enums`.
- [ ] T004 [P] [US1] Crear constantes de configuración en `src/shared/constants/domain-config.ts`: `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`, `PROMOCION_NAME_MAX_LENGTH`, `LEAD_MESSAGE_MAX_LENGTH`, `LEAD_NAME_MAX_LENGTH`, `LEAD_EMAIL_MAX_LENGTH`, `SEO_TITLE_MAX_LENGTH`, `SEO_DESCRIPTION_MAX_LENGTH`, `THUMBNAIL_WIDTH`, `THUMBNAIL_HEIGHT`.
- [ ] T005 [US1] Escribir tests de constantes en `tests/unit/constants.test.ts`: (a) cada label map cubre todos los valores del enum correspondiente (exhaustividad), (b) los valores de config son positivos, (c) los arrays de `db-enums.ts` son readonly.

**Checkpoint**: Labels y config exportados correctamente. Tests de exhaustividad pasan.

---

## Phase 3: Zod Schemas de dominio (US2)

**Purpose**: Schemas de validación que referencian las constantes como `z.enum()`

**Independent Test**: `pnpm vitest run tests/unit/schemas.test.ts` pasa. Cada schema acepta payload válido y rechaza inválido.

### Implementation

- [ ] T006 [P] [US2] Crear schema de promoción en `src/shared/types/promocion-schema.ts`: `promocionSchema` con campos name, kind, status, operation, propertyType, constructionStatus, island, municipality, address, mapPrivacyMode, seoTitle, seoDescription. Usar `z.enum()` desde `db-enums.ts`. Exportar tipo `PromocionPayload`.
- [ ] T007 [P] [US2] Crear schema de tipología en `src/shared/types/tipologia-schema.ts`: `tipologiaSchema` con campos name, usefulArea, builtArea, bedrooms, bathrooms, amenities, energyCert, referencePriceSale, referencePriceRent. Usar `z.enum(AMENITIES)` y `z.enum(ENERGY_CERTS)`. Exportar tipo `TipologiaPayload`.
- [ ] T008 [P] [US2] Crear schema de lead en `src/shared/types/lead-schema.ts`: `leadSchema` con campos name, email, phone, message, source, channel, promocionId, tipologiaId, consent (objeto con legalBasis y textAccepted). Email con `z.string().email()`. Exportar tipo `LeadPayload`.
- [ ] T009 [P] [US2] Crear schema de content block en `src/shared/types/content-block-schema.ts`: `contentBlockSchema` discriminado por `blockType`. Un sub-schema por tipo: `descripcionGeneralSchema`, `memoriaCalidadesSchema`, `zonasComunesSchema`, `ubicacionServiciosSchema`, `plazosGarantiasSchema`. Union discriminada como `contentBlockSchema`. Exportar tipo `ContentBlockPayload`.
- [ ] T010 [US2] Escribir tests de schemas en `tests/unit/schemas.test.ts`: (a) payload válido de promoción pasa `safeParse`, (b) promoción con kind inválido falla, (c) lead sin consent falla, (d) lead con email inválido falla, (e) content block de tipo DESCRIPCION_GENERAL con payload correcto pasa, (f) content block de tipo ZONAS_COMUNES con items vacíos pasa (array vacío es válido).

**Checkpoint**: Los 4 schemas Zod validan correctamente. Tests de aceptación/rechazo pasan.

---

## Phase 4: Seed Script (US3)

**Purpose**: Script `pnpm db:seed` que puebla la BD con datos demo idempotentes

**Independent Test**: `pnpm db:seed` ejecuta sin errores. Ejecutar dos veces no duplica datos.

### Implementation

- [ ] T011 [US3] Crear script de seed en `scripts/seed.ts`: conexión a BD usando `DATABASE_URL`, función `seed()` que inserta datos en orden: tenant → users → promociones → tipologías → unidades → promocionContentBlocks → mediaAssets → leads → contactConfig. Usar `ON CONFLICT DO NOTHING` para idempotencia. Hashear contraseñas con `bcryptjs`. Insertar coordenadas PostGIS con `ST_GeomFromText`. Datos según `data-model.md`.
- [ ] T012 [US3] Añadir script `db:seed` en `package.json`: `"db:seed": "tsx scripts/seed.ts"`.
- [ ] T013 [US3] Verificar que el seed compila: `pnpm typecheck` sin errores tras añadir el script. El script importa schemas y constantes correctamente.

**Checkpoint**: `pnpm db:seed` ejecuta contra BD de desarrollo. Datos son consultables. Idempotencia verificada.

---

## Phase 5: Polish & Cross-Cutting

**Purpose**: Verificación final y limpieza

- [ ] T014 Ejecutar `pnpm quality` (lint + typecheck + tests) — todo debe pasar en verde.
- [ ] T015 Verificar quickstart.md: ejecutar escenarios V-1 a V-7 y documentar resultados.
- [ ] T016 Limpiar imports no usados, verificar que `src/shared/types/.gitkeep` se puede eliminar (los schemas lo reemplazan).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — empezar inmediatamente
- **Foundational (Phase 2)**: Depende de Setup — bloquea US2 y US3
- **US2 (Phase 3)**: Depende de Phase 2 (usa las constantes en los schemas)
- **US3 (Phase 4)**: Depende de Phase 2 y Phase 3 (el seed usa constantes y podría usar schemas para validar payloads)
- **Polish (Phase 5)**: Depende de todas las fases anteriores

### User Story Dependencies

- **US1 (Constantes)**: Puede empezar tras Setup. Es prerequisito de US2 y US3.
- **US2 (Schemas)**: Puede empezar tras US1. Usa `z.enum()` con las constantes.
- **US3 (Seed)**: Puede empezar tras US1 + US2. Inserta datos coherentes con los schemas.

### Within Each Phase

- T003 y T004 son paralelizables (archivos diferentes)
- T006, T007, T008, T009 son paralelizables (archivos diferentes, todos dependen solo de T003)
- T011 depende de T006-T009 (el seed puede validar contra schemas)

### Parallel Opportunities

```bash
# Phase 2: labels y config en paralelo
Task T003: domain-labels.ts
Task T004: domain-config.ts

# Phase 3: los 4 schemas en paralelo
Task T006: promocion-schema.ts
Task T007: tipologia-schema.ts
Task T008: lead-schema.ts
Task T009: content-block-schema.ts
```

---

## Implementation Strategy

### MVP (all phases — feature is small)

Esta feature es tamaño S (1-2 días). Todas las fases se completan en secuencia:

1. Phase 1: Setup (5 min)
2. Phase 2: Constantes + tests (30 min)
3. Phase 3: Schemas + tests (45 min)
4. Phase 4: Seed script (45 min)
5. Phase 5: Verificación final (15 min)

### Clasificación de tareas para delegación

- **Dominio (backend-developer)**: T001, T003, T004, T005, T006, T007, T008, T009, T010, T011, T012, T013, T014, T015, T016
- **UI (frontend-developer)**: Ninguna — esta feature no tiene superficie visual.

---

## Notes

- Feature 100% backend/dominio. Sin componentes UI.
- Las constantes de enums de BD (`db-enums.ts`) ya existen y NO se modifican.
- El seed usa coordenadas reales de Tenerife (ver research.md R-5).
- `bcryptjs` se usa solo en el seed, no en el runtime de la aplicación.
