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

## Feature 010 · backoffice-shell
*Mergeada el 2026-07-08. Rama: `feature/010-backoffice-shell`.*

### Métricas del ciclo SDD
- Briefing inicial (spec.md): 1928 palabras
- `[NEEDS CLARIFICATION]` generados por /speckit-specify: 0 (checklist sin marcadores pendientes)
- Preguntas planteadas por /speckit-clarify: N/D
- Tareas en tasks.md: 27 (T001–T027 en 9 fases)
- Tareas reescritas tras /speckit-analyze: N/D
- Inconsistencias detectadas por /speckit-analyze: N/D
- Decisiones de diseño documentadas en research.md: 7 (R-1 a R-7: Auth.js v5, middleware, polling badge, sidebar responsivo, navegación por rol, dashboard consultas, robots.ts + X-Robots-Tag)
- Escenarios de validación en quickstart.md: 10 (V-1 a V-10)

### Métricas de implementación
- Commits en la rama: 1 (spec/plan + implementación en working tree, 35 archivos nuevos sin commitear)
- Líneas añadidas (implementación): 3.137 (sin contar `pnpm-lock.yaml`)
- Archivos nuevos (implementación): 35 (23 fuente + 12 test)
- Archivos modificados: 2 (`app/layout.tsx`, `specs/010-backoffice-shell/tasks.md`)
- Tests totales tras la feature: 462 pasando (60 test files)
- Tests nuevos de la feature: ~103 en 12 test files
- Cobertura global tras la feature: **85% statements**, 86,46% branches, 87,28% functions, 85% lines
- Cobertura en módulos críticos de la feature:
  - `auth.config.ts`: 100% statements, 100% branches, 100% functions, 100% lines
  - `session.ts`: 100% statements, 100% branches, 100% functions, 100% lines
  - `middleware.ts`: ~89% (testeado vía mocking de NextRequest/NextResponse)
  - `nav-items.ts`: 100% en todas las métricas
  - `nav-item.tsx`: 100% en todas las métricas
  - `sidebar.tsx`: ~88% statements, ~75% branches, 100% functions, ~88% lines
  - `panel-header.tsx`: 100% en todas las métricas
  - `unread-badge.tsx`: ~95% statements, ~80% branches, 100% functions, ~95% lines
  - `dashboard-content.tsx`: ~85% statements, ~70% branches, 100% functions, ~85% lines
  - `dashboard.repository.ts`: 100% statements, 100% branches, 100% functions, 100% lines
  - `unread-count/route.ts`: 100% en todas las métricas
  - `robots.test.ts`: 100% en todas las métricas
  - `root-error-boundary.tsx`: 0% statements (componente nuevo no cubierto por tests)
  - `status-colors.ts`: 100% en todas las métricas
- Lint: clean (0 errores)
- Typecheck: clean (0 errores)

### Veredictos de los guardianes
- **tdd-enforcer:** N/D (no se invocó como subagente separado). Los tests se escribieron junto con la implementación en cada fase.
- **quality-reviewer:** APROBADA CON OBSERVACIONES (0 críticas, 0 mayores, 4 menores)
  - Menores reportadas por el orquestador: [detalle no registrado en el repositorio]
- **contract-guardian:** NO APLICA (no hay API HTTP pública nueva en esta feature; el endpoint `/api/internal/leads/unread-count` es interno del backoffice)

### Desvíos respecto al plan inicial
- **Ninguno estructural.** Las 27 tareas en 9 fases se completaron según el plan. Las 6 user stories se ejecutaron en orden de dependencias (Setup → Foundational → US1 → US2 → US3 → US4 → US5 → US6 → Polish).
- La implementación se entregó en el working tree sin commitear a la rama; el único commit en la rama es el de spec/plan (`2c8dff4`). Esto es un desvío operativo: el plan sugería commits por fase o grupo lógico.
- Se añadieron 2 archivos no planificados: `root-error-boundary.tsx` (wrapper ligero de ErrorBoundary) y `status-colors.ts` (constantes de colores para estados). El `root-error-boundary` reemplazó el uso directo de `ErrorBoundary` en `app/layout.tsx`.
- El plan original llamaba al repositorio `lead-read.repository.ts`; en la implementación se nombró `dashboard.repository.ts` (abarca más que unread count: también incluye `getRecentPromociones`).

### Decisiones técnicas relevantes tomadas durante la feature
1. **Auth.js v5 con credentials provider y JWT (R-1):** Se configuró `next-auth@5` con credentials provider que valida contra la tabla `users` usando `bcryptjs`. El JWT incluye claims `tenant_id`, `user_id`, `role`, `name`. Sesión de 2h con renovación deslizante. Documentado en research.md R-1.
2. **Middleware unificado para auth guard + X-Robots-Tag (R-2):** Un solo `middleware.ts` en la raíz protege todas las rutas `/panel/*` (redirige a `/panel/login` si no hay sesión) e inyecta `X-Robots-Tag: noindex, nofollow` en todas las respuestas bajo `(auth)/`. Se excluyen rutas públicas y API pública del auth guard. Documentado en research.md R-2.
3. **Polling cada 30s para badge de leads (R-3):** Se optó por `useEffect` + `setInterval` en lugar de SSE o WebSocket. 30s es suficiente para la UX del backoffice y evita complejidad innecesaria. Documentado en research.md R-3.
4. **Sidebar responsivo con drawer en móvil (R-4):** En desktop (<768px) sidebar fijo 240px con `bg.inverted`. En móvil, drawer overlay con botón hamburguesa, `aria-modal` y focus trap. Documentado en research.md R-4.
5. **Navegación condicional centralizada por rol (R-5):** Array `NavItem[]` en `nav-items.ts` con campo `allowedRoles: UserRole[]`. El sidebar filtra items según el `role` de la sesión. ADMIN ve 7 secciones, OPERATOR ve 4, AGENT ve 3. Documentado en research.md R-5.
6. **Dashboard como landing operativa sin analítica (R-6):** Consulta leads no leídos (mismo endpoint que el badge) y últimas 5 promociones editadas (`promociones` ordenadas por `updated_at DESC`). Sin gráficos, charts ni métricas de conversión (alineado con product.md §7). Documentado en research.md R-6.
7. **Doble protección contra indexación (R-7):** `robots.ts` bloquea `/panel` y `/api`; el middleware inyecta `X-Robots-Tag: noindex, nofollow` en todas las respuestas bajo `(auth)/`. Doble capa: robots.txt para bots que lo respetan, X-Robots-Tag para los que no. Documentado en research.md R-7.
8. **`RootErrorBoundary` como wrapper ligero:** Se creó `root-error-boundary.tsx` como un wrapper minimalista que reemplaza `ErrorBoundary` de `shared/components` en `app/layout.tsx`. El root boundary no necesita los mismos handlers (onError con Sentry) que los boundaries de componentes hijos, reduciendo el acoplamiento con el módulo de observabilidad.

### Observaciones útiles para el capítulo de metodología (J2)
- **SDD funcionó para shell estructural:** Las 27 tareas en 9 fases con 6 user stories demostraron que la descomposición incremental es efectiva para un shell de UI. Cada fase producía un checkpoint verificable antes de continuar (auth funciona, sidebar renderiza, roles filtran, badge actualiza, robots bloquea).
- **Navegación centralizada facilitó el testing:** Los 7 `NavItem` con `allowedRoles` se definieron en una constante pura de 72 líneas, lo que permitió un test unitario de 75 líneas que verifica todas las combinaciones de rol (3 roles × 7 items = 21 combinaciones) sin montar React.
- **Login placeholder vs login completo:** La tarea T023 creó un formulario de login mínimo (email+password, signIn) para que el auth guard funcione. El login con diseño editorial completo es responsabilidad de F005 (auth-and-session). Esta dependencia entre features deberá gestionarse al integrar F005.
- **Fricción operativa:** La implementación no se commiteó a la rama de feature, sino que permanece en el working tree. Para el flujo SDD estándar, los commits por fase permitirían mejor trazabilidad y puntos de rollback. Esta feature ilustra cómo la urgencia puede erosionar la disciplina de commits atómicos.
- **Cobertura global cayó al 85%** desde ~92% en F009, principalmente porque los placeholders de sección (6 páginas de ~27 líneas cada una) y el layout del panel no tienen tests unitarios. `root-error-boundary.tsx` (20 líneas) tampoco está cubierto. Esto es aceptable para componentes mayoritariamente markup, pero habrá que monitorizar que la cobertura no siga cayendo en features venideras.
- **Repositorio renombrado respecto al plan:** El plan especificaba `lead-read.repository.ts`, pero en implementación se nombró `dashboard.repository.ts` porque también contiene `getRecentPromociones`. El nombre más general refleja mejor su propósito.

### Artefactos generados
- spec.md: `specs/010-backoffice-shell/spec.md` (169 líneas, 15 FRs, 7 SCs, 5 Edge Cases)
- plan.md: `specs/010-backoffice-shell/plan.md` (102 líneas, constitution check 7/7 principios PASS)
- research.md: `specs/010-backoffice-shell/research.md` (65 líneas, 7 decisiones técnicas R-1 a R-7)
- data-model.md: `specs/010-backoffice-shell/data-model.md` (85 líneas)
- quickstart.md: `specs/010-backoffice-shell/quickstart.md` (175 líneas, 10 escenarios V-1 a V-10)
- checklist: `specs/010-backoffice-shell/checklists/requirements.md` (36 líneas, 0 NEEDS CLARIFICATION)
- Tests: 12 test files, ~103 tests
  - `src/features/backoffice/components/__tests__/sidebar.spec.tsx` (204 líneas)
  - `src/features/backoffice/components/__tests__/nav-item.spec.tsx` (134 líneas)
  - `src/features/backoffice/components/__tests__/panel-header.spec.tsx` (110 líneas)
  - `src/features/backoffice/components/__tests__/dashboard-content.spec.tsx` (379 líneas)
  - `src/features/backoffice/components/unread-badge.spec.tsx` (152 líneas)
  - `src/features/backoffice/constants/__tests__/nav-items.spec.ts` (75 líneas)
  - `src/infrastructure/auth/__tests__/auth.config.spec.ts` (50 líneas)
  - `src/infrastructure/auth/__tests__/session.spec.ts` (83 líneas)
  - `src/infrastructure/auth/__tests__/middleware.spec.ts` (130 líneas)
  - `tests/unit/api/unread-count.route.test.ts` (83 líneas)
  - `tests/unit/dashboard/dashboard.repository.test.ts` (195 líneas)
  - `tests/unit/robots.test.ts` (44 líneas)
- Código (23 archivos fuente, 1.498 líneas):
  - **Auth/Infra:** `src/infrastructure/auth/auth.config.ts` (120 líneas), `session.ts` (41 líneas), `src/infrastructure/db/repositories/dashboard.repository.ts` (73 líneas)
  - **Middleware:** `middleware.ts` (49 líneas)
  - **Layouts y páginas:** `app/(auth)/panel/layout.tsx` (62 líneas), `app/(auth)/panel/page.tsx` (78 líneas), `app/(auth)/panel/login/page.tsx` (99 líneas)
  - **Placeholders (6):** `app/(auth)/panel/{catalogo,leads,equipo,contenidos,api-keys,arsop}/page.tsx` (~27 líneas c/u)
  - **Componentes:** `sidebar.tsx` (227 líneas), `nav-item.tsx` (61 líneas), `panel-header.tsx` (43 líneas), `dashboard-content.tsx` (199 líneas), `unread-badge.tsx` (121 líneas)
  - **Constantes:** `src/features/backoffice/constants/nav-items.ts` (72 líneas)
  - **Route handler:** `app/api/internal/leads/unread-count/route.ts` (31 líneas)
  - **SEO:** `app/robots.ts` (14 líneas)
  - **Shared:** `src/shared/components/root-error-boundary.tsx` (20 líneas), `src/shared/constants/status-colors.ts` (25 líneas)
- Dependencias nuevas: `next-auth@5` (Auth.js v5)

---

## Feature 013 · media-gallery-backoffice
*Completada el 2026-07-08. Rama: `feature/013-media-gallery-backoffice`. Últimos cambios en working tree pendientes de commit.*

### Métricas del ciclo SDD
- Briefing inicial (spec.md): 1703 palabras
- `[NEEDS CLARIFICATION]` generados por /speckit-specify: 0 (checklist sin marcadores pendientes)
- Preguntas planteadas por /speckit-clarify: N/D
- Tareas en tasks.md: 25 (T001–T025 en 6 fases)
- Tareas reescritas tras /speckit-analyze: N/D
- Inconsistencias detectadas por /speckit-analyze: N/D
- Decisiones de diseño documentadas en research.md: 5 (R-001 a R-005: integración en UI, upload desde servidor, @dnd-kit reutilizado, doble validación publicación, secciones separadas galería/planos)

### Métricas de implementación
- Commits en la rama (spec/plan): 1 (`d2aa49d`). Implementación en working tree sin commitear.
- Líneas añadidas (código): ~2.515 (2342 en 8 archivos nuevos + 173 en 3 archivos modificados)
- Líneas eliminadas: 16
- Archivos nuevos (código): 8 — 3 componentes UI + 1 schema Zod + 1 server actions + 3 test files
- Archivos modificados: 3 — `page.tsx`, `promocion-form.tsx`, `route.ts`
- Tests nuevos: 49 (25 unit validation + 23 unit actions + 1 integration publish) — todos pasando
- Tests totales tras la feature: 756 (76 test files, excluyendo 9 pre-existing failures no relacionados con F013)
- Cobertura global tras la feature: N/D (no se ejecutó `pnpm test:coverage` tras la feature)
- Cobertura en módulos críticos de la feature: N/D

### Veredictos de los guardianes
- **tdd-enforcer:** N/D (no se invocó como subagente separado). Tests escritos antes de la implementación — T002 y T004 especifican "Write failing tests" antes de la implementación de schemas y server actions.
- **quality-reviewer:** APROBADA TRAS 2 RONDAS (0 críticas finales)
  - **1ª ronda:** BLOQUEADA — correcciones solicitadas (detalle no registrado en el repositorio)
  - **2ª ronda:** APROBADA (0 críticas, 0 mayores, 0 menores)
- **contract-guardian:** NO APLICA (no hay API HTTP pública nueva; el route handler `/api/internal/promociones/[id]` se modifica para añadir validación pre-publish)

### Desvíos respecto al plan inicial
- **Ninguno estructural.** Las 6 fases (Setup → Foundational → US1 → US2 → US3 → Polish) se ejecutaron en orden de dependencias según tasks.md. Las 25 tareas se completaron según lo especificado.
- **Desvío operativo:** La implementación se encuentra en el working tree sin commitear a la rama. El único commit en la rama es el de spec/plan (`d2aa49d`). Mismo patrón que F010 y F012.
- No se modificó `MediaService.ts` (ya existente de F006) — consumido sin cambios, alineado con el plan.

### Decisiones técnicas relevantes tomadas durante la feature
1. **Upload siempre desde servidor vía server action (D1):** El cliente envía el archivo como `FormData` a `uploadMediaAction`. La server action invoca `MediaService.uploadImage` que firma y sube a R2. El cliente nunca tiene credenciales R2. Documentado en research.md R-002. Alineado con architecture.md §1.
2. **PDFs con placeholder visual en `MediaPreview` (D2):** Los planos (que pueden ser PDFs) se renderizan con un placeholder visual usando el componente `MediaImage` con fallback gradient CSS, en lugar de `next/image` (que no soporta PDFs). La preview muestra el nombre del archivo y un icono de documento.
3. **Ownership check en `deleteMediaAction` (D3):** Antes de eliminar un asset, se verifica en transacción que `asset.ownerId === promocionId`. Si no coincide, se rechaza con error "El asset no pertenece a esta promoción". Esto evita eliminación cruzada de assets entre promociones.
4. **Validación server-side de medios en PATCH publish (D4):** El route handler de publish verifica `validateMediaForPublish` antes de cambiar a `PUBLISHED`, análogo a la validación de bloques editoriales de F012. Doble validación: cliente (UX) + servidor (integridad). Documentado en research.md R-004.
5. **Auto-clear de feedback con setTimeout 4s (D5):** Los mensajes de éxito/error en la UI se borran automáticamente tras 4 segundos mediante `setTimeout` en el estado del `MediaUploadDialog`, evitando que el feedback visual persista indefinidamente.
6. **@dnd-kit/sortable reutilizado de F012 (D6):** Se reutiliza la misma librería de drag & drop del editor de bloques editoriales, manteniendo consistencia en la UX sin añadir dependencias nuevas. Documentado en research.md R-003.
7. **Secciones separadas galería/planos con `kind` filter (D7):** El componente `MediaGallery` filtra los assets por `kind` (`IMAGE_GALLERY` vs `PLAN`) y renderiza dos secciones visualmente separadas, cada una con su propia lista ordenable y botón de subida. La sección de planos no incluye opción de portada. Documentado en research.md R-005.

### Observaciones útiles para el capítulo de metodología (J2)
- **Constitution check:** plan.md verificó 7/7 principios PASS (Scope Rule, TDD, Zod validation, Multi-tenant DNA, WCAG AA a11y, Upload desde servidor, Enums cerrados). Sin violaciones.
- **TDD funcionó para validación y operaciones:** Los 25 tests de validación Zod se escribieron en T002 (Phase 2) antes de implementar los schemas en T003. Los 23 tests de server actions se escribieron en T004 antes de la implementación de T005–T009. El flujo RED→GREEN forzó a definir los contratos de error (mensajes, tipos de retorno, casos de session nula) antes de escribir la lógica.
- **Multi-tenant DNA preservado en dos puntos críticos:** (1) `deleteMediaAction` usa `AuthenticatedContext.withTransaction` con `SET LOCAL` para el ownership check; (2) `validateMediaForPublish` usa el mismo patrón para consultar `media_assets`. `uploadMediaAction` y `setCoverAction` delegan en `MediaService` que internamente respeta el multi-tenant.
- **A11y considerada en diálogo y errores:** `MediaUploadDialog` usa `aria-modal="true"`, `aria-labelledby` referenciando el título, y los errores de validación se renderizan con `role="alert"`. Los botones de acción llevan `aria-label` descriptivo.
- **Doble validación publicación:** `validateMediaForPublish` se ejecuta tanto en cliente (llamada desde `promocion-form.tsx` al pulsar "Publicar") como en servidor (route handler PATCH). El servidor rechaza con 422 `MEDIA_INVALID` si la validación falla, garantizando integridad incluso si se fuerza la request desde herramientas externas.
- **`Buffer.from(await new Response(file).arrayBuffer())` como workaround:** jsdom no implementa `File.arrayBuffer()`. Se usó `new Response(file).arrayBuffer()` como workaround documentado en comentario inline.
- **Mismo patrón operativo que F010 y F012:** La implementación se encuentra en el working tree sin commits por fase, lo que reduce la trazabilidad granular pero no afectó la calidad del entregable (todos los tests pasan).

### Artefactos generados
- spec.md: `specs/013-media-gallery-backoffice/spec.md` (125 líneas, 14 FRs, 7 SCs, 5 Edge Cases)
- plan.md: `specs/013-media-gallery-backoffice/plan.md` (92 líneas, constitution check 7/7 principios PASS)
- research.md: `specs/013-media-gallery-backoffice/research.md` (59 líneas, 5 decisiones técnicas R-001 a R-005)
- data-model.md: `specs/013-media-gallery-backoffice/data-model.md` (68 líneas, 5 server actions, 6 reglas validación)
- quickstart.md: `specs/013-media-gallery-backoffice/quickstart.md` (90 líneas)
- checklist: `specs/013-media-gallery-backoffice/checklists/requirements.md` (35 líneas, 0 NEEDS CLARIFICATION)
- Tests: 3 test files, 49 tests
  - `tests/unit/media-validation.test.ts` (203 líneas, 25 tests — altTextSchema, mediaKindSchema, uploadMediaSchema, deleteMediaSchema, reorderMediaSchema, setCoverSchema)
  - `tests/unit/media-actions.test.ts` (454 líneas, 23 tests — upload/delete/reorder/setCover/validateMediaForPublish con mocks de sesión, MediaService y DB)
  - `tests/integration/promocion-publish.test.ts` (103 líneas, 1 test — PATCH publish rechaza 422 sin imágenes de galería; requiere BD real con seed data)
- Código fuente (8 archivos nuevos, 3 modificados):
  - **Componentes UI (3):**
    - `src/features/promociones/components/media-gallery.tsx` (534 líneas — client component: dos secciones galería/planos, drag & drop con @dnd-kit, portada, eliminar, feedback de estado)
    - `src/features/promociones/components/media-upload-dialog.tsx` (469 líneas — diálogo modal con aria-modal, selector archivo, alt_text input, validación cliente, auto-clear feedback 4s)
    - `src/features/promociones/components/media-preview.tsx` (230 líneas — wrapper de MediaImage con placeholder para PDFs y estados de carga/error)
  - **Schema Zod:** `src/shared/types/media-schema.ts` (73 líneas — 4 schemas de payload + altTextSchema + mediaKindSchema)
  - **Server actions:** `src/features/promociones/actions/media.actions.ts` (276 líneas — 5 acciones: uploadMediaAction, deleteMediaAction, reorderMediaAction, setCoverAction, validateMediaForPublish)
  - **Integración UI (3 modificados):**
    - `app/(auth)/panel/catalogo/[id]/page.tsx` (+123 líneas — carga de media assets con props de sesión, integración de MediaGallery como sección del formulario)
    - `src/features/promociones/components/promocion-form.tsx` (+12 líneas — integración de validación pre-publish de medios)
    - `app/api/internal/promociones/[id]/route.ts` (+40 líneas — validación MEDIA_INVALID en PATCH publish)

---

## Feature 012 · editorial-blocks-editor
*Completada el 2026-07-08. Rama: `feature/012-editorial-blocks-editor`. Últimos cambios en working tree pendientes de commit.*

### Métricas del ciclo SDD
- Briefing inicial (spec.md): 1885 palabras
- `[NEEDS CLARIFICATION]` generados por /speckit-specify: 0 (checklist sin marcadores pendientes)
- Preguntas planteadas por /speckit-clarify: N/D
- Tareas en tasks.md: 38 (T001–T038 en 7 fases)
- Tareas reescritas tras /speckit-analyze: N/D
- Inconsistencias detectadas por /speckit-analyze: N/D
- Decisiones de diseño documentadas en research.md: 4 (R-001 a R-004: @dnd-kit, trigger constraint, HTML sanitizado, integración en formulario existente)
- Entidades de datos documentadas en data-model.md: 5 métodos de repositorio, 5 payloads Zod, 1 trigger SQL

### Métricas de implementación
- Commits en la rama (spec/plan): 1 (`1f07caf`). Implementación en working tree sin commitear.
- Líneas añadidas (código): 3.995 (excluyendo `pnpm-lock.yaml`, `.codebase-memory/`, `.specify/`)
- Líneas eliminadas: 31
- Archivos nuevos (código): 10 — 6 block-form components + 1 blocks-editor + 1 server actions + 1 migración SQL + 1 test de Zod schemas + 1 test de integración
- Archivos modificados (código): 8 — `promocion.repository.ts` (266 líns. añadidas), `content-block-schema.ts`, `promocion-form.tsx`, `page.tsx`, `route.ts`, `schemas.test.ts`, `tenant-isolation.test.ts`, `package.json`
- Dependencias nuevas: `@dnd-kit/core`, `@dnd-kit/sortable`

### Tests de la feature
- Tests unitarios Zod (nuevos): **26 tests** en `content-block-schema.spec.ts` — todos pasando
- Tests de schemas existentes actualizados: 6 tests de `contentBlockSchema` en `schemas.test.ts` — todos pasando
- Tests de integración (repositorio): 20 tests en `content-blocks-repository.test.ts` — requieren BD real con seed data
- Tests totales del feature: **46 tests** (26 unit + 20 integración) — 32 verificables sin BD externa
- Tests globales tras la feature: 76 test files, 707 tests (9 pre-existing failures no relacionados: auth.config, promocion-id route, email worker)
- Cobertura global: N/D (no se ejecutó `pnpm test:coverage` tras la feature)

### Veredictos de los guardianes
- **tdd-enforcer:** N/D (no se invocó como subagente separado). Tests escritos en Phase 2 antes de la implementación de repositorio y schemas (T003, T010).
- **quality-reviewer:** APROBADA (0 críticas, 0 mayores, 0 menores nuevas)
- **contract-guardian:** NO APLICA (no hay API HTTP pública nueva; el route handler `/api/internal/promociones/[id]` se modifica para añadir validación pre-publish)

### Desvíos respecto al plan inicial
- **Ninguno estructural.** Las 7 fases (Setup → Foundational → US1 → US2 → US3 → US4 → Polish) se ejecutaron en orden de dependencias según tasks.md. Las 38 tareas se completaron según lo especificado.
- **Desvío operativo:** La implementación se encuentra en el working tree sin commitear a la rama (similar a F010). El único commit en la rama es el de spec/plan (`1f07caf`). El plan sugería commits por fase o grupo lógico.
- **Migración añadida:** El trigger `check_block_kind_constraint` y su migración (`0002_block_kind_constraint.sql`) no estaban detallados en el plan original como archivo específico, aunque sí se mencionaban en research.md R-002 y data-model.md.
- Se modificó `promocion-form.tsx` para integrar la sección de bloques como una pestaña/sección más, que no estaba especificada en el plan pero era necesaria para la integración UI.

### Decisiones técnicas relevantes tomadas durante la feature
1. **Trigger SQL `check_block_kind_constraint` como última línea de defensa (D1):** Se implementó un trigger `BEFORE INSERT OR UPDATE` que verifica el `kind` de la promoción asociada y rechaza bloques `ZONAS_COMUNES`/`PLAZOS_GARANTIAS` en promociones `kind='external'`. Documentado en research.md R-002 y architecture.md §7.6. Triple capa: UI (selector oculto), servicio (validación Zod + lógica), BD (trigger).
2. **Validación Zod con discriminated union por blockType (D2):** Se refinó el schema existente (`content-block-schema.ts`) para usar `z.discriminatedUnion('blockType', ...)` con 5 sub-schemas, validación de HTML sanitizado solo para `DESCRIPCION_GENERAL` (tags permitidos: `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<p>`, `<br>`), y `min(1)` en títulos/descripciones. Documentado en research.md R-003.
3. **@dnd-kit/sortable para drag & drop (D3):** Se optó por `@dnd-kit/core` + `@dnd-kit/sortable` (~15KB) en lugar de `react-beautiful-dnd` (deprecado) o implementación manual HTML5 DnD API. Soporta keyboard navigation y screen readers. Documentado en research.md R-001.
4. **Validación pre-publish en route handler (D4):** La verificación de `validateBlocksForPublish` se integró en el route handler `PATCH /api/internal/promociones/[id]` al cambiar status a `PUBLISHED`, en lugar de en el page component. Esto evita stale state y cubre tanto la UI como llamadas API directas. FR-008.
5. **SET LOCAL en todas las transacciones del repositorio (D5):** Todos los nuevos métodos (`upsertContentBlock`, `deleteContentBlock`, `reorderContentBlocks`, `validateBlocksForPublish`) usan `withTransaction` de `TenantAwareRepository` para pasar `app.current_tenant_id` vía `SET LOCAL`, preservando el multi-tenant DNA. Alineado con architecture.md §6.

### Observaciones útiles para el capítulo de metodología (J2)
- **Constitution check:** plan.md verificó 7/7 principios PASS (Scope Rule, TDD, Zod validation, Multi-tenant DNA, No WYSIWYG libre, Kind constraint, Constants centralizadas). Sin violaciones.
- **TDD para schemas Zod:** Los 26 tests del schema refinado (`content-block-schema.spec.ts`) se escribieron en Phase 2 (T010) antes de usar los schemas en los componentes de Phase 3. Esto forzó a decidir los límites de validación (min lengths, HTML sanitizado, campos obligatorios) antes de la implementación UI.
- **Triple capa de validación de kind constraint:** UI (selector oculto) + Servicio (rechazo en upsertContentBlock) + BD (trigger). Esta arquitectura en cascada garantiza que no se pueda insertar un bloque inválido ni siquiera mediante un INSERT directo a la BD.
- **Fricción:** La implementación no se commiteó a la rama de feature, sino que permanece en el working tree (mismo patrón que F010). Para el flujo SDD estándar, los commits por fase permitirían mejor trazabilidad y puntos de rollback.
- **Integración con F011:** La sección de bloques editoriales se integró dentro del formulario de edición de promoción existente (F011) modificando `promocion-form.tsx`. El acoplamiento es mínimo — `BlocksEditor` es un client component independiente que recibe `promocionId` y `kind` como props.
- **Tests de integración pendientes de BD real:** Los 20 tests de `content-blocks-repository.test.ts` requieren una base de datos real con seed data. Sin ella, fallan por FK violation en `tenant_id`. Es el mismo patrón que otros tests de integración del proyecto (F002, F009).

### Artefactos generados
- spec.md: `specs/012-editorial-blocks-editor/spec.md` (135 líneas, 12 FRs, 7 SCs, 5 Edge Cases)
- plan.md: `specs/012-editorial-blocks-editor/plan.md` (94 líneas, constitution check 7/7 principios PASS)
- research.md: `specs/012-editorial-blocks-editor/research.md` (49 líneas, 4 decisiones técnicas R-001 a R-004)
- data-model.md: `specs/012-editorial-blocks-editor/data-model.md` (101 líneas, 1 trigger, 5 payloads, 5 métodos)
- quickstart.md: `specs/012-editorial-blocks-editor/quickstart.md` (80 líneas)
- checklist: `specs/012-editorial-blocks-editor/checklists/requirements.md` (35 líneas, 0 NEEDS CLARIFICATION)
- Tests: 2 test files nuevos + 2 modificados (46 tests total)
  - `src/shared/types/__tests__/content-block-schema.spec.ts` (285 líneas, 26 tests — 5 block types × 4-6 aserciones)
  - `tests/integration/content-blocks-repository.test.ts` (585 líneas, 20 tests — CRUD + kind constraint + reorder + publish validation)
  - `tests/unit/schemas.test.ts` (modificado — 6 nuevos tests para contentBlockSchema)
  - `tests/isolation/tenant-isolation.test.ts` (modificado — cobertura de nuevos métodos)
- Código fuente (10 archivos nuevos, 8 modificados):
  - **Componentes UI (6 formularios + editor):**
    - `src/features/promociones/components/blocks-editor.tsx` (760 líneas — client component: lista, drag & drop, add/edit/delete UI, filtro por kind)
    - `src/features/promociones/components/block-form-descripcion.tsx` (94 líneas — textarea con HTML sanitizado)
    - `src/features/promociones/components/block-form-calidades.tsx` (299 líneas — lista de ítems con icono, título, descripción)
    - `src/features/promociones/components/block-form-zonas.tsx` (245 líneas — lista de zonas)
    - `src/features/promociones/components/block-form-ubicacion.tsx` (248 líneas — lista de distancias)
    - `src/features/promociones/components/block-form-plazos.tsx` (155 líneas — formulario con 4 campos opcionales)
  - **Server actions (1 archivo con 3 acciones):**
    - `src/features/promociones/actions/content-blocks.actions.ts` (137 líneas — `upsertContentBlockAction`, `deleteContentBlockAction`, `reorderContentBlocksAction`)
  - **Backend:**
    - `src/infrastructure/db/repositories/promocion.repository.ts` (modificado, +266 líneas — 5 nuevos métodos con SET LOCAL)
    - `src/shared/types/content-block-schema.ts` (modificado, +97 líneas — discriminated union Zod con 5 sub-schemas)
    - `app/api/internal/promociones/[id]/route.ts` (modificado, +45 líneas — validación pre-publish)
  - **Migración:**
    - `src/infrastructure/db/migrations/0002_block_kind_constraint.sql` (31 líneas — trigger function + trigger)
  - **Integración UI:**
    - `app/(auth)/panel/catalogo/[id]/page.tsx` (modificado, +48 líneas — carga de bloques y renderizado de BlocksEditor)
    - `src/features/promociones/components/promocion-form.tsx` (modificado, +22 líneas — integración como sección del formulario)

---
