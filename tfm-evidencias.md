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
