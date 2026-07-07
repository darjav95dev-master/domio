# Auditoría · Feature 001 · bootstrap-project

> Generado por `code-auditor` con Claude Opus 4.8
> Fecha: 2026-07-07 14:50
> Commits auditados: `3f8111f` … `4ce3d3a` (merge `2b4270f` → main)
> Archivos modificados: 45 (config + scaffold + specs); ~19 archivos de código/config relevantes

---

## Resumen ejecutivo

Feature puramente infraestructural (scaffold Next.js 15 + tooling de calidad). El cumplimiento
de la spec es alto: los 13 requisitos funcionales (FR-001…FR-013) y los 32 tasks están
sustancialmente implementados y verificables en código real, no solo por nombre de archivo. Los
smoke tests son legítimos (aserciones reales sobre el endpoint `/api/health`, sobre `.env.example`
y sobre la carga del flat-config de ESLint) y pasan en verde (7/7). No hay hallazgos críticos. El
hallazgo de mayor peso es que `test:contract` es un `echo` placeholder que hace pasar `pnpm verify`
sin ejecutar nada — desviación del script exacto que exige `constitution.md §3`, y que además ha
persistido sin cambios hasta F005. El resto son menores: gaming potencial de cobertura, tests no
type-cheados, y una dependencia importada pero no declarada.

| Severidad | Cantidad |
|-----------|----------|
| Críticos  | 0        |
| Mayores   | 1        |
| Menores   | 8        |

**Veredicto:** 🟡 AMARILLO

---

## Hallazgos críticos

Ninguno.

---

## Hallazgos mayores

### M1 · `test:contract` es un `echo` placeholder que da falso verde en `pnpm verify`

- **Confianza:** alta
- **Archivo:** `package.json:19`
- **Regla violada:** `constitution.md §3` (Scripts mínimos obligatorios — define literalmente
  `"test:contract": "vitest --run tests/contract"`). Relacionado con `architecture.md §4.3` y §7.12
  (tests de contrato bloqueantes en `tests/contract/`).
- **Descripción:** el script es `"test:contract": "echo 'contract tests — reserved'"`. Como `echo`
  siempre retorna exit 0, `pnpm verify` (que encadena `test:contract`) reporta el paso de contrato
  como superado sin ejecutar ningún test. En F001 no existen aún contratos, por lo que es defendible
  como placeholder documentado en `tasks.md T010`; el problema real es que **ha leaked forward**: en
  el estado actual del repo (F005) el script sigue siendo el mismo `echo`, de modo que ninguna
  feature posterior ha activado la ejecución real de `tests/contract/`. El gate de contrato es, hoy,
  decorativo.
- **Código actual:**

  ```json
  "test:contract": "echo 'contract tests — reserved'",
  ```

- **Fix propuesto:** mantener el placeholder solo mientras `tests/contract/` esté vacío, pero hacerlo
  honesto (no simular verde) o, mejor, activar Vitest apuntando a esa carpeta en cuanto exista el
  primer contrato:

  ```json
  "test:contract": "vitest run tests/contract --passWithNoTests",
  ```

- **Justificación del fix:** `--passWithNoTests` permite que el gate pase cuando aún no hay contratos
  (situación de F001) pero ejecuta de verdad cualquier test que aparezca después, cerrando el falso
  verde sin bloquear el bootstrap. Alinea el script con la forma exigida por `constitution.md §3`.

---

## Hallazgos menores

### m1 · La lista `exclude` de coverage retira las páginas/layouts reales

- **Confianza:** media
- **Archivo:** `vitest.config.ts` (bloque `coverage.exclude`)
- **Regla violada:** `constitution.md §3` (cobertura 80% en statements/branches/functions/lines) — en
  espíritu; §11 (calidad medible real, no artificial).
- **Descripción:** `exclude` retira `app/layout.tsx`, `app/(public)/page.tsx` y `app/(auth)/layout.tsx`,
  dejando como único fichero de aplicación cubierto el `app/api/health/route.ts` (100% por el smoke
  test). El threshold de 80% se cumple trivialmente porque casi todo lo real está excluido. En F001,
  con placeholders sin lógica, es aceptable; el riesgo es de **precedente**: normaliza excluir vistas
  del cómputo de cobertura y puede ocultar huecos reales en features de UI posteriores.
- **Fix propuesto:** excluir por patrón solo lo genuinamente no testeable (p. ej. `**/layout.tsx`
  transitorios) con un comentario que justifique cada exclusión y revisar la lista al cerrar cada
  feature de UI, en lugar de enumerar páginas concretas.

### m2 · El threshold de cobertura 80% no lo ejecuta ningún gate

- **Confianza:** media
- **Archivo:** `package.json` (scripts `quality`, `verify`) + `.husky/pre-push`
- **Regla violada:** `constitution.md §3` (cobertura mínima) — matizado: los propios scripts que
  define §3 (`quality`, `verify`) no incluyen `test:coverage`, así que la desviación es de diseño de
  la constitución, no exclusiva de F001.
- **Descripción:** `test:coverage` existe pero no lo llama `quality`, ni `verify`, ni los hooks de
  Husky. El 80% configurado en `vitest.config.ts` solo se comprueba si alguien ejecuta manualmente
  `pnpm test:coverage`. En la práctica, el umbral no está protegido por ninguna automatización.
- **Fix propuesto:** añadir `pnpm test:coverage` al pipeline de `verify` (o a pre-push), o documentar
  explícitamente que la cobertura se valida en CI aparte.

### m3 · Los tests nunca se type-chequean

- **Confianza:** media
- **Archivo:** `tsconfig.json` (`exclude: ["...", "tests"]`)
- **Regla violada:** `constitution.md §4` (TypeScript strict) — parcial; FR-012 exige excluir `tests/`
  del build de producción, lo cual es correcto.
- **Descripción:** `tsc --noEmit` (el `typecheck`) excluye `tests/`, y Vitest ejecuta vía esbuild, que
  transpila sin comprobar tipos. Resultado: un error de tipos dentro de un test no lo detecta ningún
  comando (`quality` incluido). FR-012 pide excluir tests del *build*, no del *typecheck*.
- **Fix propuesto:** añadir un `tsconfig.test.json` que incluya `tests/` y un script
  `typecheck:tests": "tsc --noEmit -p tsconfig.test.json"` encadenado en `quality`, o usar la opción
  `typecheck` de Vitest. Mantener la exclusión de `tests/` solo en el tsconfig de build.

### m4 · `@next/eslint-plugin-next` se importa pero no se declara en package.json

- **Confianza:** media
- **Archivo:** `eslint.config.mjs:3` + `package.json` (devDependencies)
- **Regla violada:** `constitution.md §10` (dependencias explícitas/justificadas) — en espíritu.
- **Descripción:** el flat-config hace `import nextPlugin from "@next/eslint-plugin-next"`, pero
  `package.json` solo declara `eslint-config-next`; el plugin resuelve como dependencia transitiva. Si
  `eslint-config-next` cambia su árbol de dependencias, el lint rompe sin aviso.
- **Fix propuesto:** declarar `@next/eslint-plugin-next` como devDependency directa con versión
  alineada a la de Next.

### m5 · No hay guarda real contra npm/yarn

- **Confianza:** media-baja
- **Archivo:** `package.json`
- **Regla violada:** `constitution.md §1` (pnpm exclusivo); edge case declarado en `spec.md` (§Edge
  Cases: "¿Qué ocurre si el desarrollador intenta usar npm o yarn?").
- **Descripción:** existen `packageManager` y `engines.node`, pero no hay `engines.pnpm`, ni script
  `preinstall` con `only-allow pnpm`. Un `npm install` no se bloquea. La spec lo pedía "idealmente",
  de ahí la severidad baja.
- **Fix propuesto:** añadir `"preinstall": "npx only-allow pnpm"` a los scripts.

### m6 · Aserciones del test de ESLint no verifican los thresholds

- **Confianza:** media
- **Archivo:** `tests/unit/eslint-config.test.ts`
- **Regla violada:** ninguna directa; dimensión 6 (calidad de tests) del propio auditor.
- **Descripción:** el test confirma que `sonarjs/cognitive-complexity` y `sonarjs/no-duplicate-string`
  están **activas** (`[0]` es `"error"`/`2`) pero no comprueba sus valores configurados (`15` y `3`,
  exigidos por FR-003/`constitution.md §4`). Una regresión que bajara el threshold de complejidad a,
  p. ej., 50 pasaría el test. Aserción más débil de lo que el requisito permite verificar.
- **Fix propuesto:** añadir `expect(rule[1]).toBe(15)` y, para `no-duplicate-string`,
  `expect(rule[1].threshold).toBe(3)`.

### m7 · `tailwind.config.ts` es vestigial en Tailwind v4

- **Confianza:** baja
- **Archivo:** `tailwind.config.ts`
- **Regla violada:** ninguna; `architecture.md §1` indica Tailwind v4 con `@theme inline`.
- **Descripción:** Tailwind v4 define tokens vía `@theme inline` en `app/globals.css` (presente y
  correcto). El `tailwind.config.ts` con `content`/`theme.extend` vacío es residuo del patrón v3 y
  puede inducir a confusión sobre dónde viven los tokens. Task T008 lo pidió explícitamente, así que
  es una desviación menor de intención.
- **Fix propuesto:** eliminar el archivo o dejar solo un comentario apuntando a `globals.css` como
  fuente de tokens.

### m8 · Sentry no configurado (checklist Día-1 de la constitución)

- **Confianza:** baja
- **Archivo:** — (ausencia de `src/infrastructure/observability/`)
- **Regla violada:** `constitution.md §9` (checklist Día 1: "Configurar Sentry con DSN en variable de
  entorno") y §7 (observabilidad).
- **Descripción:** el checklist Día-1 incluye Sentry. F001 documenta `SENTRY_DSN` en `.env.example`
  pero no instala ni inicializa el SDK. La `spec.md` de F001 no lo incluye en sus FR (la acota como
  scaffold infra), por lo que probablemente esté deferida a una feature de observabilidad posterior.
  Se reporta por cobertura: si no existe tal feature en el roadmap, quedaría un hueco frente a §9.
- **Fix propuesto:** confirmar que existe una feature posterior que instala Sentry; si no, añadir la
  tarea al roadmap.

### m9 · `vitest.config` (estado F001) solo incluye `*.test.ts`, no `*.test.tsx`

- **Confianza:** baja
- **Archivo:** `vitest.config.ts` (versión del merge F001: `include: ["tests/**/*.test.ts"]`)
- **Regla violada:** ninguna en F001 (no hay tests `.tsx`).
- **Descripción:** en F001 no hay tests de componentes, así que no impacta; se corrige en features
  posteriores (`include: ["tests/**/*.test.{ts,tsx}"]`). Se anota por trazabilidad: un test de
  componente añadido en F001 no se habría recogido.
- **Fix propuesto:** ninguno necesario en F001; ya resuelto aguas abajo.

---

## Coherencia con features previas

F001 es la primera feature del roadmap: no hay features previas con las que colisionar, no hay imports
cruzados entre `features/`, ni duplicación de helpers (los directorios de `src/` están vacíos con
`.gitkeep`). La estructura de carpetas creada coincide con `architecture.md §5` e incluso añade
`src/shared/strategies/` (previsto por `constitution.md §2`). El único vector de coherencia
inter-feature relevante es hacia adelante: el placeholder `test:contract` (M1) se ha propagado sin
cambios hasta F005, de modo que el gate de contratos de la API pública sigue inactivo — punto a
verificar cuando se auditen F002–F005.

---

## Veredicto de tests

**Confianza: MEDIA-ALTA.** Los tres tests unitarios y el E2E son legítimos y con aserciones reales:
`smoke.test.ts` invoca el handler `GET` real y verifica status 200 + cuerpo `{status:"ok"}`;
`env-example.test.ts` valida presencia de las 10 variables y ausencia de secretos con regex;
`eslint-config.test.ts` carga el flat-config real y comprueba que las reglas sonarjs/jsx-a11y están
activas; `smoke.spec.ts` (E2E) verifica status 200 y título. No hay tests triviales
(`expect(true).toBe(true)`), ni mocks que tapen la lógica, ni aserciones vacías. No hay violación de
TDD: `constitution.md §3` exige TDD para *lógica de dominio/aplicación*, y F001 es infraestructura
pura sin dominio — que los tests y el scaffold aparezcan en el mismo commit (`fdd3396`) es aceptable
aquí. Única debilidad: `eslint-config.test.ts` no verifica los valores de threshold (m6), lo que baja
la confianza de ALTA a MEDIA-ALTA.

---

## Métricas

- Archivos modificados: 45 (≈19 de código/config auditables; resto specs y `pnpm-lock.yaml`)
- Líneas añadidas / borradas: +6863 / -375 (incl. `pnpm-lock.yaml` +5678)
- Cobertura medida en esta feature: efectivamente 100% sobre el único fichero incluido
  (`app/api/health/route.ts`); artificial por exclusión de páginas/layouts (m1)
- Cobertura sin contar exclusiones artificiales: no evaluable de forma significativa (sin lógica de
  dominio en F001)
- Complejidad cognitiva máxima encontrada: trivial (<5); ninguna función supera el umbral de 15
- Tiempo de ejecución de tests unitarios F001: ~1.46 s (7 tests, 3 archivos, verde)

---

## Recomendación

⚠️ **Aceptar con reparaciones recomendadas** (veredicto AMARILLO). No hay hallazgos críticos y la
feature es defendible académicamente: cumple los 13 FR y sus 32 tasks tienen respaldo real en código,
con tests honestos. Antes de dar el bootstrap por definitivo conviene atacar M1 (el falso verde de
`test:contract`, que además contamina F002–F005) y los menores m2/m3 (gates de cobertura y typecheck
de tests) para que la red de calidad automatizada sea real y no nominal. El resto son mejoras de bajo
coste.
