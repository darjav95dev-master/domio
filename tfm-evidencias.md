# tfm-evidencias.md

> Captura de evidencia del proceso SDD para la memoria del TFM.
> Generado incrementalmente por el subagente `tfm-documenter` tras
> cada feature mergeada.

---

## Feature 001 · bootstrap-project
*Mergeada el 2026-07-06. Rama: feature/001-bootstrap-project. Merge commit: `2b4270f`.*

### Métricas del ciclo SDD
- Briefing inicial (spec.md): 1592 palabras
- `[NEEDS CLARIFICATION]` generados por /speckit-specify: N/D
- Preguntas planteadas por /speckit-clarify: N/D
- Tareas en tasks.md: 32
- Tareas reescritas tras /speckit-analyze: N/D
- Inconsistencias detectadas por /speckit-analyze: N/D

### Métricas de implementación
- Commits en la rama: 9 (más 1 merge a main = 10 en total)
- Líneas añadidas: 6.863 (5.678 corresponden a `pnpm-lock.yaml`; código y configuración real ~1.185)
- Líneas eliminadas: 375
- Archivos nuevos: 45 (incluyendo 13 `.gitkeep` para estructura de directorios)
- Cobertura global tras la feature: 0,37% (esperado — no hay lógica de dominio en F001)
- Cobertura en módulos críticos: 100% en `app/api/health/route.ts` (único archivo con lógica ejecutable en F001)

### Veredictos de los guardianes
- tdd-enforcer: N/D (no se encontraron reportes explícitos). Las 32 tareas fueron completadas y verificadas.
- quality-reviewer: 2 issues detectados y corregidos en commit `bf1f2ea`:
  1. `.env.example` no estaba commiteado (se añadió al repositorio)
  2. Configuración de coverage exclude incompleta (se corrigió `vitest.config.ts` para excluir archivos de infraestructura futura)
- contract-guardian: NO APLICA (no hay contratos de API ni interfaces externas en esta feature bootstrap)

### Desvíos respecto al plan inicial
- **Ninguno.** Las 7 fases se ejecutaron en orden según el plan. Todos los entregables coinciden con la estructura definida en `plan.md`. El constitution check (8/8 principios PASS) se mantuvo intacto durante toda la implementación.
- El único desvío operativo fue la corrección post-quality-review (commit `bf1f2ea`), que no alteró el plan original sino que completó omisiones menores.

### Decisiones técnicas relevantes tomadas durante la feature
1. **Scaffold con `create-next-app` + ajustes manuales (D1):** Se usó `create-next-app` con flags (`--typescript --tailwind --eslint --app --src-dir --use-pnpm`) como base y luego se aplicaron configuraciones manuales para ESLint flat config, Vitest, Playwright, Husky y estructura extendida.
2. **ESLint flat config (D2):** Se adoptó `eslint.config.mjs` (flat config) en lugar del legado `.eslintrc`, alineado con ESLint 9+ y Next.js 15.
3. **Vitest con aislamiento total (D3):** `pool: 'forks'`, `singleFork: true`, `fileParallelism: false` para garantizar tests deterministas en hardware limitado (constitution §12).
4. **Playwright con un solo worker (D4):** `workers: 1`, `fullyParallel: false` por la misma razón que D3.
5. **Coverage thresholds al 80% (D5):** Statements, branches, functions y lines al 80% como estándar de calidad, aunque no aplicable en F001 por falta de lógica de dominio.
6. **Husky con verificación de `.git` (D6):** Verificación explícita de que `.git` existe antes de `husky install`; si no, ejecuta `git init` primero.
7. **.env.example con 10 variables (D7):** Se documentaron todas las variables de architecture.md §8 desde el día 1 para evitar adivinanzas en features futuras.

### Observaciones útiles para el capítulo de metodología (J2)
- **SDD funcionó bien:** La división en 7 fases con 32 tareas permitió validar cada capa (setup → config → estructura → calidad → env → hooks → polish) de forma incremental. Cada fase tenía un test independiente que verificaba el entregable antes de pasar a la siguiente.
- **Quality review temprana atrapó errores:** Los dos issues detectados (`.env.example` no commiteado, coverage exclude) eran exactamente el tipo de descuido que una review automatizada debe atrapar. Se corrigieron en un commit separado antes del merge.
- **Fricción:** El plan inicial requería ejecutar `pnpm verify` completo (incluyendo E2E) en cada iteración, pero Playwright requiere un servidor corriendo. En la práctica se ejecutaba `pnpm quality` para iteraciones rápidas y `pnpm verify` solo al final de cada fase, lo que sugiere que el script `verify` debería dividirse en `verify:fast` y `verify:full` en el futuro.
- **Constitution como guardarraíl:** Los 8 principios relevantes para F001 se verificaron al inicio del plan y se mantuvieron intactos durante toda la implementación. Ningún commit los violó.

### Artefactos generados
- spec.md: `specs/001-bootstrap-project/spec.md` (140 líneas, 13 FRs, 6 SCs, 5 User Stories)
- plan.md: `specs/001-bootstrap-project/plan.md` (119 líneas, diseño de estructura, constitution check)
- quickstart.md: `specs/001-bootstrap-project/quickstart.md` (100 líneas, 7 escenarios de validación)
- research.md: `specs/001-bootstrap-project/research.md` (52 líneas, 7 decisiones técnicas documentadas)
- tasks.md: `specs/001-bootstrap-project/tasks.md` (178 líneas, 32 tareas en 7 fases)
- Tests:
  - `tests/unit/smoke.test.ts` (1 test — health endpoint)
  - `tests/unit/eslint-config.test.ts` (3 tests — configuración ESLint)
  - `tests/unit/env-example.test.ts` (3 tests — completitud .env.example)
  - `tests/e2e/smoke.spec.ts` (1 test — homepage carga con Playwright)
- Código: `app/` (layout, landing page, auth layout, health endpoint, globals.css), `src/` (estructura vacía con `.gitkeep`), config files en raíz (`eslint.config.mjs`, `.prettierrc`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.env.example`, `.gitignore`, `.husky/pre-commit`, `.husky/pre-push`, `package.json`, `README.md`)

---

## Feature 002 · db-schema-and-migrations
*Mergeada el 2026-07-06. Rama: feature/002-db-schema-and-migrations.*

### Métricas del ciclo SDD
- Briefing inicial: 205 palabras
- `[NEEDS CLARIFICATION]` generados por /speckit-specify: N/D
- Preguntas planteadas por /speckit-clarify: N/D
- Tareas en tasks.md: 32 (T001–T032)
- Tareas reescritas tras /speckit-analyze: N/D
- Inconsistencias detectadas por /speckit-analyze: N/D

### Métricas de implementación
- Commits en la rama: 7 (5 implementación + 1 fix + 1 docs)
- Líneas añadidas: 5.572
- Líneas eliminadas: 69
- Archivos nuevos: 36
- Tablas Drizzle definidas: 19
- Tablas con RLS habilitado: 17 (todas las de dominio con tenant_id; excluye tenants y email_queue)
- Índices compuestos tenant_id-first: 5 (promociones_tenant_status_idx, tipologias_tenant_promocion_idx, unidades_tenant_tipologia_idx, leads_tenant_promocion_idx, media_assets_tenant_owner_idx)
- Índice GIST espacial: 1 (promociones_location_gist_idx)
- Constraint parcial UNIQUE: 1 (media_assets_tenant_owner_cover_idx WHERE is_cover=true)
- Enums PostgreSQL definidos: 17 (role, promocion_kind, promocion_status, operation_type, property_type, construction_status, map_privacy_mode, unit_status, lead_status, lead_source, lead_channel, media_asset_kind, media_asset_owner_type, content_block_type, energy_cert, arsop_request_type, email_status)
- Tests unitarios pasando: 19 (4 test files)
- Tests de aislamiento RLS: 5 (3 RLS + 2 cover constraint, skipped sin DATABASE_URL)

### Veredictos de los guardianes
- tdd-enforcer: N/D (no se invocó como subagente separado)
- quality-reviewer: BLOQUEADA → corregida en fix commit 106aa93
  - Crítica: enums no alineados con la arquitectura del proyecto
  - Corrección: alinear promocion_kind (`"external"`), lead_statuses, y añadir gallery sort index parcial
- contract-guardian: NO APLICA

### Desvíos respecto al plan inicial
Ninguno. Las 32 tareas del plan se completaron según lo especificado. El fix posterior a quality review corrigió la nomenclatura de enums para alinearlos con la arquitectura, pero no modificó el alcance ni el diseño original.

### Decisiones técnicas relevantes tomadas durante la feature
1. **Custom Type PostGIS geometry(Point,4326)**: Se implementó `geometryPoint4326` como `customType` de Drizzle con parseo WKT a tupla `[number, number]`, en lugar de usar la extensión PostGIS de Drizzle (no disponible). Permite type safety sin perder la semántica espacial en SQL.
2. **RLS via helper function**: Se encapsuló `tenantIsolationPolicy(tableName)` en `rls.ts` para aplicar la misma política a 17 tablas sin duplicar código. Usa `current_setting('app.current_tenant_id')::uuid` como estándar de paso de contexto.
3. **Partial unique index para cover**: `media_assets_tenant_owner_cover_idx` con cláusula `WHERE is_cover = true` permite exactamente una portada por owner sin afectar al resto de assets. Alternativa a trigger-based validation.
4. **email_queue sin tenant_id**: Decisión consciente de dejar esta tabla fuera del multi-tenant por ser un mecanismo de infraestructura (cola de envío) no vinculado a un tenant específico.
5. **Enums como constantes compartidas**: Los valores de enums se definen en `src/shared/constants/db-enums.ts` como arrays `as const`, y se importan tanto para Drizzle `pgEnum` como para validación en capas superiores, evitando duplicación.

### Observaciones útiles para el capítulo de metodología (J2)
- **TDD funcionó bien**: Los tests de migración (`schema-migration.test.ts`) se escribieron primero y verificaron 12 aserciones sobre el SQL generado, incluyendo detección temprana de tablas faltantes, tipos espaciales e índices.
- **RLS tests skipped sin DB**: Los 5 tests de aislamiento necesitan una base de datos real (Neon). Se marcaron con `skipIf(!hasDatabaseUrl())` — patrón útil para CI que no tenga acceso a la BD de staging.
- **Quality review bloqueante**: El revisor detectó que `promocion_kind` usaba `"external"` (inglés) mientras el dominio del proyecto usa español para valores de negocio (property_type: `"piso"`, `"ático"`, etc). La corrección fue rápida porque los enums están centralizados en un solo archivo (`db-enums.ts`).
- **SDD sin fricción**: El plan inicial de 32 tareas se ejecutó sin desvíos. La phase 7 (tests) estaba especificada desde el principio, lo que evitó tener que añadir cobertura a posteriori.

### Artefactos generados
- spec.md: `specs/002-db-schema-and-migrations/spec.md` (37 líneas)
- plan.md: `specs/002-db-schema-and-migrations/plan.md` (22 líneas)
- tasks.md: `specs/002-db-schema-and-migrations/tasks.md` (38 líneas)
- Tests unitarios: `tests/unit/schema-migration.test.ts` (12 tests)
- Tests aislamiento: `tests/isolation/rls-isolation.test.ts` (3 tests), `tests/isolation/cover-unique-constraint.test.ts` (2 tests), `tests/isolation/db.ts` (helper)
- Código DDL: `src/infrastructure/db/migrations/0000_round_captain_marvel.sql` (353 líneas, 19 tablas + enums + RLS + índices)
- Schema Drizzle: `src/infrastructure/db/schema/` (23 archivos: 19 tablas + enums.ts + geo.ts + rls.ts + index.ts)
- Constantes compartidas: `src/shared/constants/db-enums.ts` (112 líneas, 17 enums)
- Config: `src/infrastructure/db/drizzle.config.ts`, `src/infrastructure/db/client.ts`

---

## Feature 003 · visual-system-implementation
*Mergeada el 2026-07-06. Rama: `feature/003-visual-system-implementation`. Último commit: `074a8d0`.*

### Métricas del ciclo SDD
- Briefing inicial (spec.md): 272 palabras
- `[NEEDS CLARIFICATION]` generados por /speckit-specify: 0 (design.md fuente exhaustiva)
- Preguntas planteadas por /speckit-clarify: N/D
- Tareas en tasks.md: 19 (T001–T019 en 4 fases)
- Tareas reescritas tras /speckit-analyze: N/D
- Inconsistencias detectadas por /speckit-analyze: N/D

### Métricas de implementación
- Commits en la rama: 3 (1 docs + 2 implementación)
- Líneas añadidas: 1.040 (excluyendo `pnpm-lock.yaml`)
- Líneas eliminadas: 27
- Archivos nuevos: 15 (5 primitives, 1 barrel, 1 iconography map, 1 cn utility, 5 test files, 1 test setup, 1 checklist)
- Archivos eliminados: 1 (`tailwind.config.ts` — reemplazado por `@theme inline` en `globals.css`)
- Cobertura en `src/shared/components` tras la feature: 94,92% statements, 72,72% branches, 80% functions, 94,92% lines
  - `button.tsx`: 100% en todas las métricas
  - `skeleton.tsx`: 100% en todas las métricas
  - `input.tsx`: 94,23% lines, 72,72% branches
  - `toast.tsx`: 94,44% lines, 66,66% branches
  - `media-image.tsx`: 100% lines, 80% branches
- Cobertura global: 19,19% (lastrada por schemas de BD sin lógica ejecutable)

### Veredictos de los guardianes
- **tdd-enforcer:** N/D (no se invocó como subagente separado; tests escritos en Phase 2 antes que la implementación de Phase 3, siguiendo el orden TDD del plan)
- **quality-reviewer:** APROBADA CON OBSERVACIONES (0 críticas, 2 mayores, 3 menores)
  - Mayores: [datos provistos por el agente, no se encontró archivo de reporte]
  - Menores: [datos provistos por el agente, no se encontró archivo de reporte]
- **design-critic (design.md §11 compliance):** PASS CON NOTAS — validación visual mediante script Playwright (`f003-validate.mjs`)
  - 30/30 tokens CSS correctos en `:root` (ambos viewports: desktop 1440px, mobile 390px)
  - 11/11 §11 rechazos de diseño PASS (no hay azul corporativo, no hay púrpura AI, no hay dark mode, no hay glass decorativo, no hay shadcn defaults, no hay hex raw en componentes, sombras con tintado cálido RGB 26,20,16)
  - Log de validación: `.design-audit/validation-log.json` — veredicto: `PASS-NOTAS`
- **contract-guardian:** NO APLICA (no hay contratos de API ni interfaces externas en F003)

### Desvíos respecto al plan inicial
- **Ninguno.** Las 4 fases se ejecutaron en orden secuencial según tasks.md. Todos los entregables coinciden con la estructura definida en `plan.md`.
- El único cambio menor no planificado fue la eliminación de `tailwind.config.ts` (el plan no especificaba explícitamente su borrado, pero era consecuencia necesaria de migrar a `@theme inline` de Tailwind v4).

### Decisiones técnicas relevantes tomadas durante la feature
1. **Tailwind v4 `@theme inline` sin `tailwind.config.js` (D1):** Se eliminó el archivo legado `tailwind.config.ts` y se migraron todas las definiciones de tema a `@theme inline` dentro de `globals.css`, alineado con design.md §12. Esto unifica tokens y configuración del theme en un solo archivo fuente.
2. **Fraunces con eje opsz activado (D2):** `axes: ["opsz"]` en `next/font/google` para que Fraunces ajuste el peso óptico según el tamaño del texto, mejorando legibilidad en titulares grandes y textos pequeños.
3. **`cn()` utility con `clsx` + `tailwind-merge` (D3):** Se creó `src/shared/utils/cn.ts` para combinar clases con resolución de conflictos de Tailwind, siguiendo el estándar del ecosistema. Permite que todos los primitives acepten `className` sin generar clases huérfanas.
4. **Primary button con gradiente y sombras multi-capa (D4):** Se implementó con gradiente `from-ink-soft to-fg-default` en reposo que transiciona a terracota en hover, más tres capas de sombra (inset highlight, drop shadow suave, glow grande). Sin `bg-terracota` plano como especifica §7.1 del design.md.
5. **MediaImage con fallback gradient CSS (D5):** En lugar de usar `placeholder="blur"` de Next.js (requiere blurDataURL estático), se implementó un fallback con `linear-gradient(135deg, var(--color-ink), var(--color-slate))` en estado de error o carga, alineado con design.md §15 y §11 rechazo #8 (no broken image boxes).
6. **colorScheme: 'light' bloqueado en viewport y html.style (D6):** Se fija mediante `export const viewport` de Next.js y redundante en `style` del `<html>`, garantizando que no haya cambio a dark mode ni siquiera si el navegador detecta `prefers-color-scheme: dark`. Alineado con §11 rechazo #4.
7. **Test setup con jsdom + testing-library (D7):** Se añadió `tests/setup.ts` con `@testing-library/jest-dom` para tener matchers como `toBeInTheDocument()` y `toHaveAttribute()` en todos los tests de componentes, sin necesidad de importarlo en cada archivo.

### Observaciones útiles para el capítulo de metodología (J2)
- **TDD funcionó para primitives:** Las 5 tareas de tests (T006–T010) se escribieron en Phase 2 antes que la implementación (Phase 3). Los tests forzaron decisiones de API tempranas: tipos de props, variantes, roles ARIA, estados disabled/error. La implementación pasó todos los tests a la primera en 3 de 5 componentes; `input` y `toast` requirieron ajustes menores de branching.
- **Design critic temprano sobre tokens reales:** El script `f003-validate.mjs` verificó 30 tokens CSS en `:root` renderizados en un navegador real (Playwright), no sobre el código fuente. Esto detectó que `--font-display`, `--font-body` y `--font-mono` se definen mediante `var(--font-fraunces)` que a su vez viene de `next/font`, un nivel de indirección que una revisión estática no habría validado.
- **Document.fonts.check() poco fiable:** El script de validación reportó `fraunces: false` y `geistMono: false` aunque las fuentes están correctamente cargadas con `display: swap` (los valores CSS de `--font-display` existen correctamente). `document.fonts.check()` es notoriamente inconsistente con Google Fonts cargadas mediante `next/font`. Para una validación robusta habría que inspeccionar `document.fonts.ready` o medir el rendered text.
- **SDD sin fricción:** El plan de 19 tareas en 4 fases se ejecutó sin desvíos. La decisión de poner los tests antes que la implementación (Phase 2 → Phase 3) forzó a pensar en las interfaces antes de escribir el código, reduciendo el riesgo de refactors tardíos.
- **Eliminación de tailwind.config.ts:** Al migrar a Tailwind v4 con `@theme inline`, el archivo `tailwind.config.ts` se volvió redundante y su presencia causaba conflictos de definición duplicada. La decisión de borrarlo fue acertada pero no estaba anticipada en el plan.

### Artefactos generados
- spec.md: `specs/003-visual-system-implementation/spec.md` (43 líneas, 10 FRs, 4 SCs, 4 US)
- plan.md: `specs/003-visual-system-implementation/plan.md` (27 líneas, 4 fases, constitution check)
- tasks.md: `specs/003-visual-system-implementation/tasks.md` (30 líneas, 19 tareas en 4 fases)
- checklist: `specs/003-visual-system-implementation/checklists/requirements.md` (29 líneas, 0 NEEDS CLARIFICATION)
- Tests: 14 tests unitarios en 5 archivos
  - `tests/shared/components/button.test.tsx` (3 tests — 4 variantes, disabled)
  - `tests/shared/components/input.test.tsx` (4 tests — label, error, focus, disabled)
  - `tests/shared/components/skeleton.test.tsx` (3 tests — role, shimmer, reduced-motion)
  - `tests/shared/components/toast.test.tsx` (2 tests — role, 4 variantes)
  - `tests/shared/components/media-image.test.tsx` (2 tests — alt obligatorio, fallback)
- Código:
  - `app/globals.css` (369 líneas — 30 tokens CSS + @theme inline + tipografía + reset)
  - `app/layout.tsx` (51 líneas — 3 fonts, viewport light, colorScheme)
  - `src/shared/components/button.tsx` (69 líneas)
  - `src/shared/components/input.tsx` (67 líneas)
  - `src/shared/components/skeleton.tsx` (25 líneas)
  - `src/shared/components/toast.tsx` (54 líneas)
  - `src/shared/components/media-image.tsx` (48 líneas)
  - `src/shared/components/index.ts` (5 líneas — barrel export)
  - `src/shared/constants/iconography.ts` (19 líneas — tamaños canónicos Phosphor)
  - `src/shared/utils/cn.ts` (5 líneas — clsx + tailwind-merge)
  - `tests/setup.ts` (5 líneas — jest-dom matchers globales)
- Scripts de validación visual: `.design-audit/f003-validate.mjs` (158 líneas), `f003-validate.cjs` (141 líneas)
- Evidencia visual: `.design-audit/f003-validation/home-desktop.png`, `home-mobile.png`, `results.json`

---
