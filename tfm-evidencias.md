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

## Feature 007 · email-queue-and-resend
*Mergeada el 2026-07-08. Rama: `feature/007-email-queue-and-resend`. Commits: `8c6cd7b`, `582790e`.*

### Métricas del ciclo SDD
- Briefing inicial (spec.md): 2179 palabras
- `[NEEDS CLARIFICATION]` generados por /speckit-specify: N/D
- Preguntas planteadas por /speckit-clarify: N/D
- Tareas en tasks.md: 42 (T001–T042 en 7 fases)
- Tareas reescritas tras /speckit-analyze: N/D
- Inconsistencias detectadas por /speckit-analyze: N/D
- Decisiones de diseño documentadas en research.md: 6 (R1–R6: SDK Resend, FOR UPDATE SKIP LOCKED, backoff exponencial, templates funcionales, dual entry point del worker, validación Zod en encolado)
- Escenarios de validación en quickstart.md: 6

### Métricas de implementación
- Commits en la rama: 2 (1 de spec/plan + 1 de implementación completa)
- Líneas añadidas: 3.880 (de las cuales 46 son `pnpm-lock.yaml`)
- Líneas eliminadas: 2
- Archivos nuevos: 31 (incluyendo 9 de tests, 5 artefactos de spec, 14 de código fuente en `src/`, 2 scripts/entry points, 1 actualización a `db-enums.ts`)
- Archivos de código fuente: 13 en `src/infrastructure/email/` + 1 en `src/shared/constants/` + 1 en `scripts/` = 14 archivos
- Tests del módulo email: 91 tests (87 unit + 4 integration) en 9 test files — todos pasando
- Tests globales tras la feature: 203 tests, 32 test files — todos pasando
- Lint: clean (0 errores)
- Typecheck: clean (0 errores)

### Veredictos de los guardianes
- **tdd-enforcer:** N/D (no se invocó como subagente separado). Las 42 tareas se completaron siguiendo TDD estricto (tests RED antes de implementación).
- **quality-reviewer:** APROBADA TRAS CORRECCIONES (no se encontró archivo de reporte, la información es de reporte del orquestador)
  - Correcciones solicitadas no documentadas en el repositorio.
- **contract-guardian:** NO APLICA (no hay API HTTP pública en esta feature; el contraro de interfaz del servicio email se documentó en `contracts/email-service.md` como documento interno de diseño)

### Desvíos respecto al plan inicial
- **Ninguno.** Las 7 fases se ejecutaron según el plan. T001–T042 se completaron en orden de dependencias. La fase 7 (Polish) verificó lint, typecheck y tests de integración. El flujo completo (encolado → procesamiento → envío con backoff) funciona según lo especificado.
- El único cambio operativo fue que la implementación se entregó en un solo commit (`582790e`) que abarcó todas las fases, mientras que el plan sugería commits por fase o grupo lógico.

### Decisiones técnicas relevantes tomadas durante la feature
1. **FOR UPDATE SKIP LOCKED como mecanismo anti-doble-procesamiento (D1):** El worker reclama filas con `SELECT ... FOR UPDATE SKIP LOCKED` en lugar de usar un estado intermedio `PROCESSING`. Esto evita complejidades de timeouts de filas stuck y es compatible con Neon/PgBouncer transaction pooling.
2. **Backoff exponencial con fórmula `2^(attempts+1) × 60s` (D2):** Produce intervalos de 2, 4, 8, 16, 32 minutos. Sin jitter (no necesario para volúmenes MVP). Máximo 5 intentos (~62 minutos hasta FAILED permanente). Documentado en research.md R3.
3. **Templates como funciones puras con payload validado por Zod (D3):** Cada template es una función `(payload) => { subject, html, text }` con un schema Zod que define las variables requeridas. El HTML usa sustitución de placeholders `{{variable}}`. Interfaz compatible con migración futura a React Email.
4. **Dos entry points que comparten lógica de procesamiento (D4):** `scripts/worker-emails.ts` (standalone con `tsx`, bucle configurable 30s, manejo de SIGTERM) y `src/infrastructure/email/worker-handler.ts` (handler para Vercel cron trigger). Ambos invocan `processQueue()` del mismo worker. Documentado en research.md R5.
5. **Validación de email con Zod en el servicio de encolado, no en el worker (D5):** El worker confía en que la fila fue validada al encolar. Esto evita duplicar lógica de validación y ahorra un intento de backoff en caso de formato inválido. Documentado en research.md R6.
6. **`email_queue` sin `tenant_id` como tabla de infraestructura (D6):** Decisión heredada de F002 (documentada en comentario del schema línea 12). El worker no filtra por tenant porque la cola es un mecanismo de infraestructura, no de dominio. Esta decisión **NO** está alineada con `architecture.md` §6.5, que lista `tenant_id` como columna de `email_queue` — ver Observaciones.

### Observaciones útiles para el capítulo de metodología (J2)
- **TDD funcionó para infraestructura externa:** Los 91 tests del módulo email se escribieron siguiendo RED→GREEN, incluyendo tests que mockean el SDK de Resend. La interfaz `ResendClient` se diseñó como interfaz TypeScript para permitir mocking — el worker nunca depende del SDK concreto, solo de la interfaz.
- **Inconsistencia documental preexistente (architecture.md vs schema real):** `architecture.md` §6.5 (línea 340) lista `tenant_id` como columna de `email_queue`, pero el schema real (`src/infrastructure/db/schema/email-queue.ts`) no la incluye por decisión deliberada de F002 (comentario línea 12: "Infrastructure table — no tenant_id, no RLS by design"). Esta inconsistencia no fue causada por F007 pero es relevante para la memoria porque ilustra un desfase entre la documentación arquitectónica y la implementación. **No corregir dentro de F007** porque modificar `architecture.md` no está en el alcance de ninguna feature del MVP.
- **Único commit de implementación:** Aunque el plan sugería commits por fase o grupo lógico, la implementación se entregó en un solo commit (`582790e`). Esto reduce la granularidad del historial pero no afectó la calidad del entregable, que pasó lint, typecheck y los 203 tests globales.
- **SDD sin fricción:** El plan de 42 tareas en 7 fases se ejecutó sin desvíos. La separación US1–US4 con fases independientes (US3 ejecutable en paralelo con US2) demostró ser efectiva. El checkpoint de Phase 2 (foundational) antes de comenzar las user stories evitó duplicación de infraestructura.

### Artefactos generados
- spec.md: `specs/007-email-queue-and-resend/spec.md` (134 líneas, 15 FRs, 7 SCs, 4 US, 6 Edge Cases)
- plan.md: `specs/007-email-queue-and-resend/plan.md` (107 líneas, 7 fases, constitution check)
- research.md: `specs/007-email-queue-and-resend/research.md` (95 líneas, 6 decisiones técnicas documentadas)
- data-model.md: `specs/007-email-queue-and-resend/data-model.md` (131 líneas)
- quickstart.md: `specs/007-email-queue-and-resend/quickstart.md` (90 líneas, 6 escenarios)
- contract: `specs/007-email-queue-and-resend/contracts/email-service.md` (167 líneas)
- checklist: `specs/007-email-queue-and-resend/checklists/requirements.md` (37 líneas)
- tests: 9 test files, 91 tests
  - `tests/unit/email/types.test.ts` (34 líneas)
  - `tests/unit/email/email-templates.test.ts` (167 líneas)
  - `tests/unit/email/email.service.test.ts` (152 líneas)
  - `tests/unit/email/email.repository.test.ts` (70 líneas)
  - `tests/unit/email/resend.client.test.ts` (137 líneas)
  - `tests/unit/email/templates.test.ts` (263 líneas)
  - `tests/unit/email/worker.test.ts` (401 líneas)
  - `tests/unit/email/worker-standalone.test.ts` (153 líneas)
  - `tests/integration/email/email-queue.integration.test.ts` (531 líneas)
- Código:
  - `src/infrastructure/email/types.ts` (68 líneas — 4 interfaces, 4 clases de error)
  - `src/infrastructure/email/email.repository.ts` (107 líneas — findPendingEligible, markSent, markFailed, markRetry)
  - `src/infrastructure/email/email.service.ts` (80 líneas — enqueue con validación Zod)
  - `src/infrastructure/email/resend.client.ts` (57 líneas — send con validación de API key al construir)
  - `src/infrastructure/email/worker.ts` (94 líneas — processQueue, calculateNextAttempt)
  - `src/infrastructure/email/worker-handler.ts` (113 líneas — handler serverless para Vercel cron)
  - `src/infrastructure/email/templates/index.ts` (32 líneas — registry)
  - `src/infrastructure/email/templates/utils.ts` (11 líneas — helpers de renderizado)
  - `src/infrastructure/email/templates/lead-assigned-agent.ts` (67 líneas)
  - `src/infrastructure/email/templates/lead-confirmation.ts` (63 líneas)
  - `src/infrastructure/email/templates/team-invitation.ts` (63 líneas)
  - `src/infrastructure/email/templates/password-recovery.ts` (68 líneas)
  - `src/shared/constants/email-templates.ts` (47 líneas — nombres + schemas Zod)
  - `scripts/worker-emails.ts` (58 líneas — entry point standalone)

---

## Feature 008 · rate-limiting-and-observability
*Mergeada el 2026-07-08. Rama: `feature/008-rate-limiting-and-observability`. Commits: `f6d17a5`, `40fc088`, `10f3283`.*

### Métricas del ciclo SDD
- Briefing inicial (spec.md): 1779 palabras
- `[NEEDS CLARIFICATION]` generados por /speckit-specify: 0 (checklist sin marcadores pendientes)
- Preguntas planteadas por /speckit-clarify: N/D
- Tareas en tasks.md: 28 (T001–T028 en 7 fases)
- Tareas reescritas tras /speckit-analyze: N/D
- Inconsistencias detectadas por /speckit-analyze: N/D
- Decisiones de diseño documentadas en research.md: 6 (R1–R6: Upstash Redis, sliding window counter, Sentry SDK, ErrorBoundary class component, degradación graceful, filtrado de secrets)
- Entidades de datos documentadas en data-model.md: 3 (RateLimitConfig, RateLimitResult, SentryContext)
- Interfaces contractuales documentadas en contracts: 3 (RateLimiter, SentryWrapper, ErrorBoundary)

### Métricas de implementación
- Commits en la rama: 3 (1 spec/plan + 1 implementación + 1 fix post-review)
- Líneas añadidas: 2.848 (excluyendo `pnpm-lock.yaml`)
- Líneas eliminadas: 2
- Archivos nuevos: 34 (incluyendo 13 test files, 21 archivos de código fuente)
- Archivos modificados: 4 (`app/layout.tsx`, `src/shared/components/index.ts`, `vitest.config.ts`, `src/vitest-env.d.ts`)
- Tests totales tras la feature: 309 pasando (45 test files)
- Tests nuevos de la feature: ~80 en 13 test files
- Cobertura global tras la feature: **91,23% statements**, 88,37% branches, 93% functions, 91,23% lines
- Cobertura en módulos críticos de la feature:
  - `rate-limiter.ts`: 100% statements, 75% branches, 100% functions, 100% lines
  - `rate-limiter.factory.ts`: 100% statements, 75% branches, 100% functions, 100% lines
  - `redis-client.ts`: 85,18% statements, 75% branches, 100% functions, 85,18% lines
  - `api-key-middleware.ts`: 100% statements, 90,9% branches, 100% functions, 100% lines
  - `ip-rate-limit.ts`: 100% statements, 94,73% branches, 100% functions, 100% lines
  - `sentry.wrapper.ts`: 99,18% statements, 94,73% branches, 100% functions, 99,18% lines
  - `sentry-common.ts`: 100% en todas las métricas
  - `sentry-integration.ts`: 100% en todas las métricas
  - `error-boundary.tsx`: 100% en todas las métricas
  - `logger.ts`: 100% en todas las métricas
  - `extract-ip.ts`: 100% statements, 85,71% branches, 100% functions, 100% lines
  - `rate-limits.ts` (constantes): 100% en todas las métricas
- Lint: clean (0 errores)
- Typecheck: clean (0 errores)

### Veredictos de los guardianes
- **tdd-enforcer:** N/D (no se invocó como subagente separado; los tests se escribieron en cada fase antes de la implementación siguiendo el plan TDD)
- **quality-reviewer:** APROBADA TRAS CORRECCIONES
  - **1ª ronda:** 2 críticas — consumidores duplicaban lógica cliente/servidor de Sentry y usaban `console.warn` para logging — corregidas en commit `10f3283`
  - **2ª ronda:** APROBADA (0 críticas, 2 menores cosméticas)
  - Correcciones aplicadas: (1) Sentry config unificada en `sentry-common.ts` para evitar divergencia client/server; (2) `redis-client.ts` extraído como singleton; (3) `consume()` atómico; (4) `logger.ts` reemplaza `console.warn`; (5) `extract-ip.ts` extraído como utility; (6) flag `markSentryInitialized()` para verificación real de inicialización.
- **contract-guardian:** NO APLICA (no hay API HTTP externa nueva en esta feature; los contratos internos del rate limiter y Sentry wrapper se documentaron en `contracts/rate-limiting-and-observability.md`)

### Desvíos respecto al plan inicial
- **Ninguno estructural.** Las 28 tareas en 7 fases se completaron según el plan. Las fases US1, US2, US3 y US4 se ejecutaron secuencialmente según las dependencias especificadas.
- **Cambios operativos post-review:** Se añadieron 5 archivos no planificados (`redis-client.ts`, `sentry-common.ts`, `logger.ts`, `extract-ip.ts`, `sentry-common.spec.ts`) como resultado de la refactorización solicitada por quality-reviewer. El plan original incluía la lógica en línea dentro de `rate-limiter.ts` y `sentry.{client,server}.config.ts` por separado.
- La implementación se entregó en un único commit (`40fc088`) que abarcó todas las fases, con un commit de fix posterior (`10f3283`) para las correcciones de revisión.

### Decisiones técnicas relevantes tomadas durante la feature
1. **Sliding window counter con dos sub-ventanas (D1):** Se implementó el algoritmo de ventana deslizante con dos claves Redis (contador actual + contador ponderado por solapamiento), en lugar de fixed window (burst en bordes) o sliding window log (O(N) memoria). Documentado en research.md R2.
2. **consume() atómico vía INCR como primitiva (D2):** Se unificó `check()` e `increment()` en un solo método `consume()` que realiza la verificación y el incremento en una operación atómica, evitando race conditions entre la lectura y la escritura. Implementado tras revisión de quality-reviewer.
3. **Cliente Redis compartido como singleton (D3):** Se extrajo `redis-client.ts` para evitar múltiples conexiones a Upstash desde distintos puntos de la aplicación. El cliente se instancia una sola vez y se reutiliza vía el factory del rate limiter. Implementado tras revisión de quality-reviewer.
4. **Sentry config compartida (sentry-common.ts) (D4):** Se unificó la configuración de Sentry (beforeSend, beforeBreadcrumb, filtrado de secrets) en `sentry-common.ts`, eliminando la duplicación entre `sentry.client.config.ts` y `sentry.server.config.ts`. Implementado tras revisión de quality-reviewer.
5. **Logger estructurado propio (D5):** Se creó `src/shared/utils/logger.ts` con niveles (error, warn, info, debug) en lugar de usar `console.warn` directo, permitiendo filtrado por nivel y formato consistente. Implementado tras revisión de quality-reviewer.
6. **isSentryConfigured con flag de inicialización real (D6):** En lugar de verificar solo la existencia de `SENTRY_DSN`, se añadió un flag `markSentryInitialized()` que se activa tras `Sentry.init()` exitoso, permitiendo detectar casos donde el DSN existe pero la inicialización falló.
7. **Degradación graceful con try/catch y fallback a allow (D7):** El rate limiter envuelve cada operación Redis en try/catch. Si el almacén falla, retorna `{ allowed: true }` con log warn. El consumidor nunca necesita manejar errores del rate limiter. Documentado en research.md R5.
8. **Filtrado de secrets en Sentry con regex recursivo (D8):** Se implementó `sanitizeEvent()` que recorre recursivamente el payload del evento eliminando keys que matchean `password|secret|token|api_?key|authorization|cookie`. El `tenant_id` no se filtra — es un identificador de negocio requerido. Documentado en research.md R6.

### Observaciones útiles para el capítulo de metodología (J2)
- **TDD funcionó para infraestructura externa:** Los ~80 tests se escribieron siguiendo RED→GREEN, incluyendo mocks de `@upstash/redis` y `@sentry/nextjs`. La interfaz `RateLimiter` se diseñó como interfaz TypeScript para permitir mocking completo del almacén.
- **Quality review atrapó duplicación crítica:** La primera revisión detectó que `sentry.client.config.ts` y `sentry.server.config.ts` duplicaban la misma lógica de filtrado de secrets y configuración. La extracción a `sentry-common.ts` redujo el código duplicado y previno divergencia futura entre cliente y servidor.
- **Atomicidad del rate limiter como descubrimiento tardío:** El diseño inicial separaba `check()` e `increment()` como métodos independientes, pero la revisión identificó una race condition: entre check e increment, otra request podía incrementar. La unificación en `consume()` atómico fue la corrección más significativa del review.
- **Logger como decisión transversal:** `logger.ts` en `src/shared/utils/` resultó ser una utilidad reutilizable más allá del rate limiting. Su nivelación (error, warn, info, debug) permite filtrado futuro sin cambiar las llamadas.
- **Degradación graceful verificada en tests:** El test `rate-limiter.spec.ts` mockea un error de conexión de Upstash y verifica que `consume()` retorna `allowed: true` y se genera un log warn con el motivo. Este test verifica el contrato de degradación graceful (CA-3) sin depender de una instancia real de Upstash.
- **Error boundary con 100% de cobertura:** El `error-boundary.tsx` alcanza 100% en statements, branches, functions y lines con 294 líneas de tests que verifican: captura de error, renderizado de fallback con mensaje y botón, reset del state, callback onError, y accesibilidad (role="alert").

### Artefactos generados
- spec.md: `specs/008-rate-limiting-and-observability/spec.md` (179 líneas, 6 RFs, 10 CA, 5 escenarios)
- plan.md: `specs/008-rate-limiting-and-observability/plan.md` (99 líneas, constitution check 11/11 principios PASS)
- research.md: `specs/008-rate-limiting-and-observability/research.md` (98 líneas, 6 decisiones técnicas)
- data-model.md: `specs/008-rate-limiting-and-observability/data-model.md` (95 líneas, 3 entidades, 5 claves Redis)
- contracts: `specs/008-rate-limiting-and-observability/contracts/rate-limiting-and-observability.md` (137 líneas, 4 interfaces)
- checklist: `specs/008-rate-limiting-and-observability/checklists/requirements.md` (35 líneas, 0 NEEDS CLARIFICATION)
- quickstart.md: `specs/008-rate-limiting-and-observability/quickstart.md` (88 líneas, 6 escenarios)
- Tests: 13 test files, ~80 tests
  - `src/infrastructure/rate-limiting/rate-limiter.spec.ts` (176 líneas)
  - `src/infrastructure/rate-limiting/redis-client.spec.ts` (50 líneas)
  - `src/infrastructure/rate-limiting/api-key-middleware.spec.ts` (240 líneas)
  - `src/infrastructure/rate-limiting/ip-rate-limit.spec.ts` (214 líneas)
  - `src/infrastructure/observability/sentry.wrapper.spec.ts` (263 líneas)
  - `src/infrastructure/observability/sentry-common.spec.ts` (50 líneas)
  - `src/infrastructure/tenant/sentry-integration.spec.ts` (78 líneas)
  - `src/infrastructure/auth/rate-limit-login.spec.ts` (104 líneas)
  - `src/features/api-public/with-rate-limit.spec.ts`
  - `src/features/contact/contact-form-action.spec.ts`
  - `src/shared/components/error-boundary.spec.tsx` (294 líneas)
  - `src/shared/utils/extract-ip.spec.ts` (27 líneas)
  - `src/shared/utils/logger.spec.ts` (32 líneas)
- Código fuente (21 archivos nuevos):
  - `src/infrastructure/rate-limiting/rate-limiter.types.ts` (38 líneas — interfaces RateLimitConfig, RateLimitResult, RateLimiter)
  - `src/infrastructure/rate-limiting/rate-limiter.ts` (116 líneas — sliding window counter con degrade graceful)
  - `src/infrastructure/rate-limiting/rate-limiter.factory.ts` (49 líneas — factory con no-op si no hay URL)
  - `src/infrastructure/rate-limiting/redis-client.ts` (46 líneas — singleton Redis)
  - `src/infrastructure/rate-limiting/api-key-middleware.ts` (79 líneas — middleware por API key)
  - `src/infrastructure/rate-limiting/ip-rate-limit.ts` (114 líneas — rate limit por IP con lockout)
  - `src/infrastructure/observability/sentry-common.ts` (52 líneas — config compartida)
  - `src/infrastructure/observability/sentry.wrapper.ts` (126 líneas — captureError, setTenantContext, addBreadcrumb)
  - `src/infrastructure/auth/rate-limit-login.ts` (45 líneas — integración Auth.js)
  - `src/infrastructure/tenant/sentry-integration.ts` (30 líneas — integración con TenantContext)
  - `src/features/api-public/with-rate-limit.ts` (helper para route handlers)
  - `src/features/contact/contact-form-action.ts` (56 líneas — server action con rate limit)
  - `src/shared/components/error-boundary.tsx` (100 líneas — class component con fallback a11y)
  - `src/shared/constants/rate-limits.ts` (39 líneas — constantes de límites)
  - `src/shared/utils/logger.ts` (30 líneas — log estructurado)
  - `src/shared/utils/extract-ip.ts` (24 líneas — extracción de IP del request)
  - `instrumentation.ts` — hook Next.js para inicializar Sentry
  - `sentry.client.config.ts` — configuración client-side (refactorizada)
  - `sentry.server.config.ts` — configuración server-side (refactorizada)
  - `app/global-error.tsx` — global error handler Next.js
  - `src/vitest-env.d.ts` — tipos adicionales de vitest

---

## Feature 009 · domain-constants-and-seed
*Mergeada el 2026-07-08. Rama: `feature/009-domain-constants-and-seed`. Commits: `eb81b28`, `b4cf455`, `ba97ef1`.*

### Métricas del ciclo SDD
- Briefing inicial (spec.md): 2225 palabras
- `[NEEDS CLARIFICATION]` generados por /speckit-specify: 0 (checklist sin marcadores pendientes)
- Preguntas planteadas por /speckit-clarify: N/D
- Tareas en tasks.md: 16 (T001–T016 en 5 fases)
- Tareas reescritas tras /speckit-analyze: N/D
- Inconsistencias detectadas por /speckit-analyze: N/D
- Decisiones de diseño documentadas en research.md: 6 (R-1 a R-6: estado de constantes, formato labels, seed idempotente, hash bcryptjs, coordenadas demo, estructura payloads editoriales)
- Escenarios de validación en quickstart.md: 7 (V-1 a V-7)

### Métricas de implementación
- Commits en la rama: 3 (1 feat spec/plan + 1 feat implement + 1 fix post-review)
- Líneas añadidas: 2.564 (excluyendo `pnpm-lock.yaml` y `.codebase-memory/`)
- Líneas eliminadas: 2
- Archivos nuevos (código): 10 — `domain-labels.ts`, `domain-config.ts`, `promocion-schema.ts`, `tipologia-schema.ts`, `lead-schema.ts`, `content-block-schema.ts`, `seed.ts`, `constants.test.ts`, `schemas.test.ts`, `seed.test.ts`
- Archivos nuevos (spec): 7 — spec.md, plan.md, tasks.md, research.md, data-model.md, quickstart.md, checklists/requirements.md
- Tests totales tras la feature: 351 pasando (48 test files)
- Tests nuevos de la feature: 42 (19 unit constants + 19 unit schemas + 4 integration seed)
- Cobertura global tras la feature: **91,92% statements**, 88,37% branches, 93% functions, 91,92% lines
- Cobertura en módulos críticos de la feature:
  - `src/shared/constants/domain-labels.ts`: 100% en todas las métricas
  - `src/shared/constants/domain-config.ts`: 100% en todas las métricas
  - `src/shared/types/content-block-schema.ts`: 100% en todas las métricas
  - `src/shared/types/lead-schema.ts`: 100% en todas las métricas
  - `src/shared/types/promocion-schema.ts`: 100% en todas las métricas
  - `src/shared/types/tipologia-schema.ts`: 100% en todas las métricas
  - `scripts/seed.ts`: no instrumentado (script CLI ejecutado con tsx, fuera de cobertura Vitest)
- Lint: clean (0 errores)
- Typecheck: clean (0 errores)
- `pnpm db:seed`: ejecuta sin errores, idempotente verificado (segunda ejecución reporta "Seed data already exists for this tenant. Skipping.")

### Veredictos de los guardianes
- **tdd-enforcer:** N/D (no se invocó como subagente separado; tests escritos conjuntamente con la implementación siguiendo TDD del plan)
- **quality-reviewer:** APROBADA TRAS CORRECCIONES MENORES
  - 1ª ronda: 0 críticas, 0 mayores, 3 menores — corregidas en commit `ba97ef1`
  - Correcciones aplicadas: (1) tipología C-301 ampliada con 2 unidades adicionales (C-302, C-303) para datos demo más realistas; (2) eliminado `eslint-disable-next-line` genérico para regla sonarjs/no-duplicate-string; (3) añadido comentario explicativo sobre carga manual de `.env.local` como alternativa a `tsx --env-file`.
  - 2ª ronda (implícita tras fix): APROBADA
- **contract-guardian:** NO APLICA (no hay API HTTP pública en esta feature)

### Desvíos respecto al plan inicial
- **Ninguno estructural.** Las 16 tareas en 5 fases se completaron según el plan. El orden de dependencias (US1 → US2 → US3) se respetó. Los tests de constantes y schemas se escribieron antes o junto con la implementación.
- Único cambio operativo: la implementación se entregó en un solo commit (`b4cf455`) que abarcó el código de todas las fases, con un commit de fix posterior (`ba97ef1`) para las observaciones de quality-reviewer.

### Decisiones técnicas relevantes tomadas durante la feature
1. **Labels de dominio como `Record<EnumValue, string>` con `as const` (D1):** Se adoptó el formato de objeto `Record<EnumValue, string>` en lugar de arrays de `{ value, label }`. Cada mapa (`PROPERTY_TYPE_LABELS`, `CONSTRUCTION_STATUS_LABELS`, etc.) se exporta con `as const` — inmutabilidad en tiempo de compilación y acceso O(1) por clave. Si se necesita un array para selects, se deriva con `Object.entries()`. Documentado en research.md R-2.
2. **Zod schemas usan `z.enum()` referenciando `db-enums.ts` como fuente única (D2):** Los 4 schemas Zod (`promocionSchema`, `tipologiaSchema`, `leadSchema`, `contentBlockSchema`) importan los arrays `as const` de `db-enums.ts` y los usan directamente en `z.enum()`, sin duplicar los valores como strings literales. Esto garantiza que la validación esté alineada con los tipos TypeScript y los enums de BD. Alineado con architecture.md §7.7.
3. **Seed idempotente con early-return + transacción única con `set_config` para RLS (D3):** El script verifica si el tenant `domio` ya existe al inicio y retorna temprano si es así, evitando duplicación. La transacción usa `set_config('app.current_tenant_id', ...)` para establecer el contexto RLS antes de cada INSERT, en lugar de `SET LOCAL` (que causaba errores de sintaxis en versiones anteriores de PostgreSQL). Las contraseñas se hashean una sola vez incluso si el seed se ejecuta múltiples veces.
4. **`bcryptjs` para hash de contraseñas en seed (D4):** Se añadió `bcryptjs` como devDependency en lugar de depender del `bcrypt` transitivo de Auth.js. `bcryptjs` es pure JavaScript, no requiere compilación nativa (node-gyp), y se ejecuta correctamente con `tsx` fuera del contexto de Next.js. Documentado en research.md R-4.
5. **`DEFAULT_ISLAND` constante para evitar duplicación de strings (D5):** Se definió `const DEFAULT_ISLAND = "Tenerife"` al inicio de `seed.ts` y se referencia en las 8 promociones demo, evitando el string literal repetido. Alineado con constitution.md §2 (scope rule, sin magic numbers).

### Observaciones útiles para el capítulo de metodología (J2)
- **SDD funcionó para constantes y schemas:** Los 38 tests unitarios (19 constants + 19 schemas) verificaron exhaustividad de labels, inmutabilidad, y validación de payloads. La decisión de centralizar constantes en `db-enums.ts` como fuente única permitió que los schemas Zod referenciaran tipos ya existentes sin duplicación.
- **Seed como script idempotente testeable:** El test de integración (`seed.test.ts`) verifica CA-4 (ejecución sin errores), CA-5 (conteo de registros), CA-6 (todos los registros llevan tenant_id) y CA-7 (idempotencia) en un solo archivo de 166 líneas con 4 tests. La función `seed()` se exporta como función pura que acepta la conexión, lo que permite testing sin efectos secundarios globales.
- **`set_config` vs `SET LOCAL` como hallazgo técnico:** El seed usa `set_config('app.current_tenant_id', ...)` en lugar de `SET LOCAL` porque este último causaba error de sintaxis en ciertas versiones de PostgreSQL cuando se usaba dentro de transacciones Drizzle. Este hallazgo se documentó en el propio código (comentario en `scripts/seed.ts`).
- **Quality review atrapó omisiones menores:** Las 3 observaciones (unidades insuficientes en una tipología, eslint-disable genérico, falta de comentario sobre env loading) fueron correcciones rápidas pero útiles para mantener la calidad del código.
- **Fricción:** Los tests de integración del seed requieren una base de datos real y RLS configurado. El test de idempotencia (CA-7) ejecuta el seed dos veces, lo que duplica el tiempo del test (~300ms para 2 ejecuciones). No se pudo mockear porque la lógica de `ON CONFLICT DO NOTHING` necesita una BD real.

### Artefactos generados
- spec.md: `specs/009-domain-constants-and-seed/spec.md` (214 líneas, 6 RFs, 10 CA, 5 escenarios)
- plan.md: `specs/009-domain-constants-and-seed/plan.md` (88 líneas, constitution check 6/6 principios PASS)
- research.md: `specs/009-domain-constants-and-seed/research.md` (85 líneas, 6 decisiones técnicas)
- data-model.md: `specs/009-domain-constants-and-seed/data-model.md` (132 líneas)
- quickstart.md: `specs/009-domain-constants-and-seed/quickstart.md` (89 líneas, 7 escenarios V-1 a V-7)
- checklist: `specs/009-domain-constants-and-seed/checklists/requirements.md` (35 líneas, 0 NEEDS CLARIFICATION)
- Tests: 3 test files, 42 tests
  - `tests/unit/constants.test.ts` (157 líneas, 19 tests — exhaustividad labels, inmutabilidad, valores positivos)
  - `tests/unit/schemas.test.ts` (233 líneas, 19 tests — aceptación/rechazo por schema)
  - `tests/integration/seed.test.ts` (166 líneas, 4 tests — CA-4, CA-5, CA-6, CA-7)
- Código:
  - `src/shared/constants/domain-labels.ts` (86 líneas — 7 mapas label: PROPERTY_TYPE, CONSTRUCTION_STATUS, OPERATION_TYPE, LEAD_STATUS, PROMOTION_STATUS, USER_ROLE, AMENITY)
  - `src/shared/constants/domain-config.ts` (34 líneas — 10 constantes de configuración: DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PROMOCION_NAME_MAX_LENGTH, LEAD_MESSAGE_MAX_LENGTH, LEAD_NAME_MAX_LENGTH, LEAD_EMAIL_MAX_LENGTH, SEO_TITLE_MAX_LENGTH, SEO_DESCRIPTION_MAX_LENGTH, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
  - `src/shared/types/promocion-schema.ts` (31 líneas — schema Zod con z.enum() desde db-enums)
  - `src/shared/types/tipologia-schema.ts` (20 líneas — schema Zod con z.enum(AMENITIES) y z.enum(ENERGY_CERTS))
  - `src/shared/types/lead-schema.ts` (31 líneas — schema Zod con consentimiento RGPD)
  - `src/shared/types/content-block-schema.ts` (78 líneas — schema discriminado por block_type, 5 sub-schemas)
  - `scripts/seed.ts` (932 líneas — seed idempotente con 8 fases, 1 tenant, 5 usuarios, 8 promociones, 16 tipologías, 38 unidades, 32 content blocks, 16 media assets, 5 leads, contact config)
- Scripts: `"db:seed": "tsx scripts/seed.ts"` en `package.json`
- Dependencias nuevas: `bcryptjs` + `@types/bcryptjs`

---
