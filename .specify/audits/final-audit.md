# Auditoría Final · Domio · F001–F005 (media-service)

> Generado por `code-auditor` (modelo: claude-sonnet-4-6)
> Fecha: 2026-07-07
> Features auditadas: F001 (bootstrap), F002 (db-schema), F003 (visual-system), F004 (tenant-context), F005-audit (media-service, merge F006 en git)
> Base: cinco informes parciales + análisis transversal de código en main

---

## 1. Veredicto ejecutivo

**APTO CON RESERVAS** — El proyecto demuestra disciplina arquitectónica genuina: el modelo de datos multi-tenant está diseñado correctamente desde el primer día (todas las tablas llevan `tenant_id NOT NULL`, RLS por tabla, índices compuestos tenant-first), el mecanismo central de aislamiento (`SET LOCAL` dentro de transacción via `TenantContext`) es sólido y está probado, y el sistema visual materializa `design.md` con notable fidelidad. Sin embargo, dos features llevan veredicto ROJO sin correcciones aplicadas: F002 (RLS sin `FORCE` — el propietario de las tablas elude las policies en producción) y el media service (bypasa completamente el patrón `TenantAwareRepository` en sus cinco métodos de acceso a datos). Adicionalmente, TDD fue ignorado en 4 de 5 features con evidencia de git incontrovertible, lo que compromete la defensa metodológica del TFM. El proyecto NO es NO APTO porque los defectos son corregibles y las fundaciones son correctas; sí requiere reparación de los dos críticos de F002 y del media service antes de ser defendible académicamente como sistema de producción multi-tenant.

---

## 2. Tabla consolidada de hallazgos por severidad y feature

| Feature | Veredicto | Críticos | Mayores | Menores | Hallazgo dominante |
|---------|-----------|----------|---------|---------|---------------------|
| F001 bootstrap | AMARILLO | 0 | 1 | 8 | `test:contract` es echo falso-verde |
| F002 db-schema | ROJO | 2 | 6 | 6 | RLS sin FORCE + policies FOR ALL en histórico |
| F003 visual-system | AMARILLO | 0 | 2 | 7 | z-toast < z-nav; TDD roto |
| F004 tenant-context | AMARILLO | 1 | 4 | 3 | CI grep check #2 no detecta db.transaction() |
| F005 media-service | ROJO | 2 | 4 | 8 | Bypass completo de TenantAwareRepository |
| **TOTAL** | | **5** | **17** | **32** | |

---

## 3. Hallazgos transversales nuevos

Los siguientes hallazgos son visibles únicamente con contexto global del repositorio; ningún informe individual los identifica como patrón sistémico.

### X1 · TDD post-hoc sistémico — 4 de 5 features sin evidencia de ciclo RED→GREEN en git

- **Severidad:** Mayor (sistémico, no solo de proceso)
- **Confianza:** Alta
- **Alcance:** F002 M4, F003 M2, F004 M3, F005 C2 — todas los commits de lógica de negocio (F002 schemas+RLS, F004 TenantContext+repositorio, F005 MediaService) entregan tests e implementación en el mismo commit sin commit RED previo
- **Por qué es transversal:** cada informe lo reporta como hallazgo aislado; el patrón sistémico implica que el tdd-enforcer subagente no bloqueó ningún PR, o no se ejecutó. Para el TFM, que reclama SDD con TDD como principio, la falta de evidencia de TDD en git en 80% de las features es una vulnerabilidad académica de primer orden.
- **Fix transversal:** para las features ya mergeadas, añadir al menos un commit de test de regresión por feature que pruebe un comportamiento no cubierto, creando la evidencia de test-first retroactiva. Para features futuras, exigir que el tdd-enforcer bloquee explícitamente el merge si el primer commit de la tarea no contiene únicamente tests.

---

### X2 · `validateRequiredString` / patrón lazy-proxy de env duplicado entre dos módulos de infraestructura

- **Severidad:** Menor
- **Confianza:** Alta
- **Archivos:** `src/infrastructure/tenant/env.ts` (función `validatePublicTenantId` + proxy lazy) y `src/infrastructure/media/env.ts` (función `validateRequiredString` + proxy lazy)
- **Descripción:** Ambos módulos implementan el mismo patrón (función de validación → singleton congelado → `Proxy` con `get`) de forma independiente y con nombres distintos. Cuando se añada env para Resend, Sentry o Redis, el patrón se triplicará. La extracción a `src/shared/utils/createEnvProxy.ts` o a `src/infrastructure/utils/env.ts` eliminaría la duplicación y daría un único lugar para añadir Zod (como exige architecture.md §1).
- **Fix:** Ver Top-10 #7.

---

### X3 · `test:contract` placeholder sin fix en ninguna feature — gate de contrato de API pública decorativo desde F001 hasta hoy

- **Severidad:** Mayor (transversal — se señaló en F001 M1 pero no se corrigió en F002–F005)
- **Confianza:** Alta
- **Archivo:** `package.json:15` — `"test:contract": "echo 'contract tests — reserved'"`
- **Descripción:** Cinco features han pasado por `pnpm verify` sin que ninguna activara el gate de tests de contrato. La API pública (`/api/v1/`) es una superficie declarada en product.md §1 y architecture.md §4.3. Si cualquier feature posterior introduce un route handler de API pública, su contrato no estará protegido por ningún test automático en CI. El fix es de una línea y se ha diferido cinco features.
- **Fix:** Ver Top-10 #2.

---

### X4 · `describe.skipIf(!hasDatabaseUrl())` en 4 suites de aislamiento — la suite de seguridad crítica se auto-silencia en CI sin DATABASE_URL

- **Severidad:** Mayor (transversal — F002 M1 lo señaló, pero persiste sin que CI configure DATABASE_URL)
- **Confianza:** Alta
- **Archivos:** `tests/isolation/rls-isolation.test.ts:5`, `tenant-isolation.test.ts:58`, `public-context.test.ts:25`, `cover-unique-constraint.test.ts:5`
- **Descripción:** Estas cuatro suites son precisamente las que verifican el invariante de seguridad central de Domio (aislamiento multi-tenant, visibilidad cruzada entre tenants). En CI —donde no hay `DATABASE_URL`— el runner las omite silenciosamente y reporta verde. El resultado: el CI nunca ha ejecutado los tests que probarían que RLS funciona. Que F002 haya mergeado con `geo.ts` roto (SRID/WKB incorrecto, M3) confirma que la suite no corrió contra una BD real.
- **Fix transversal:** añadir un job separado en ci.yml con `DATABASE_URL` apuntando a una BD de test Neon (branch de test), o convertir el `skipIf` en un error explícito en entorno CI (`process.env.CI === 'true'`).
- **Nota:** este fix requiere decisión humana (provisionar BD de test en CI); no es auto-aplicable.

---

### X5 · `.eslintignore` deprecated persistente — 5 features sin que nadie lo elimine

- **Severidad:** Menor
- **Confianza:** Alta
- **Archivo:** `/Users/dariojavierdiazcaballero/Desktop/Domio/.eslintignore` — confirmado que existe hoy
- **Descripción:** F003 m6 identificó que ESLint v9 deprecó `.eslintignore` y emite un warning en cada `pnpm lint`. El archivo ha sobrevivido a 4 features adicionales. El ignore de `.design-audit/` que aplica ya está cubierto en `eslint.config.mjs`. Es una línea de ruido en cada ejecución de lint, innecesaria.
- **Fix:** Ver Top-10 #6.

---

### X6 · CI grep check #1 con exención demasiado amplia (`src/infrastructure/` entero en lugar de rutas quirúrgicas)

- **Severidad:** Menor-Mayor
- **Confianza:** Media
- **Archivo:** `.github/workflows/ci.yml:46`
- **Descripción:** El check de bare `SET ` (sin `LOCAL`) exime todo `src/infrastructure/`, incluyendo `media/`, `context/`, y cualquier módulo futuro (email, slug, geocoding). Si un servicio nuevo en `src/infrastructure/email/` escribe `SET app.current_tenant_id = X` sin `LOCAL`, el CI no lo detecta. F004 m2 lo señaló pero no se corrigió.
- **Fix:** Ver Top-10 #8.

---

### X7 · Drift product.md → código: Sentry, rate limiting y Auth.js sin ninguna feature que los implemente

- **Severidad:** Mayor (riesgo de TFM)
- **Confianza:** Alta
- **Descripción:** product.md §8 y architecture.md §1 declaran Sentry como infraestructura crítica ("sin Sentry, un error en un sistema multi-tenant no es depurable"). F001 m8 señaló la ausencia y anticipó una feature posterior. Cinco features después, Sentry sigue sin inicializar. Del mismo modo: (a) architecture.md §1 declara rate limiting con Upstash Redis para endpoints públicos, pero `app/api/internal/media/upload/route.ts` no tiene rate limiting; (b) Auth.js v5 está en el stack declarado pero no hay `auth.ts`, `auth.config.ts` ni ningún handler de credentials en main — la feature 005 (auth-and-session) está en rama sin mergear. El roadmap debe asegurar que estas tres piezas llegan antes del cierre del TFM; si no están, la brecha entre lo declarado en architecture.md y lo implementado es técnicamente un drift specs↔código de criticidad media.

---

## 4. Top-10 de fixes por impacto

> Criterio de auto-aplicabilidad: AUTOMATICO = cambio de código/config sin decisiones de diseño, sin migraciones, sin nuevas dependencias (o dependencias ya declaradas en package.json). HUMANO = requiere decisión de arquitectura, migración de BD, o coordinación con infraestructura externa.

---

### FIX-01 · CI grep check #2: añadir `transaction` y `execute` al patrón detectado

> **ESTADO: APLICADO** — commit `c8ddcad` en rama `audit/fixes-2026-07-08`

- **ID de referencia:** F004 C1
- **Aplicabilidad:** AUTOMATICO
- **Archivos afectados:** `.github/workflows/ci.yml` (líneas 56-64)
- **Fix:**

  ```yaml
  - name: CI grep check #2 — no raw db queries outside repositories/tenant
    run: |
      matches=$(git ls-files '*.ts' \
        | grep -vE '^src/infrastructure/db/repositories/' \
        | grep -vE '^src/infrastructure/tenant/' \
        | while read -r file; do
          awk '{sub(/\/\/.*/,""); \
            if ($0 ~ /db\.(select|insert|update|delete|transaction|execute)/ || \
                $0 ~ /\.database\.(select|insert|update|delete|transaction|execute)/) \
              print FILENAME":"NR":"$0}' "$file"
        done)
      if [ -n "$matches" ]; then
        echo "Found raw db queries outside allowed paths:"
        echo "$matches"
        exit 1
      fi
  ```

- **Verificación:** `pnpm build && git ls-files '*.ts' | grep -vE '^src/infrastructure/db/repositories/' | grep -vE '^src/infrastructure/tenant/' | xargs grep -n "database.transaction\|db.transaction" | grep -v "//"`
- **Impacto:** habría bloqueado F005/F006 (media.service.ts) en PR. Cierra el gap que permite eludir TenantAwareRepository mediante `db.transaction()`.

---

### FIX-02 · `test:contract`: reemplazar echo por vitest con --passWithNoTests

> **ESTADO: APLICADO** — commit `f91706c` en rama `audit/fixes-2026-07-08`

- **ID de referencia:** F001 M1 (transversal X3)
- **Aplicabilidad:** AUTOMATICO
- **Archivos afectados:** `package.json` (línea 15)
- **Fix:**

  ```json
  "test:contract": "vitest run tests/contract --passWithNoTests",
  ```

- **Verificación:** `pnpm test:contract` debe completar sin error. Ejecutar `mkdir -p tests/contract && pnpm test:contract` para confirmar que --passWithNoTests funciona con carpeta vacía.
- **Impacto:** hace el gate de contrato honesto. Con `--passWithNoTests`, pasa con carpeta vacía pero ejecutará de verdad en cuanto exista el primer contrato (API pública F_X).

---

### FIX-03 · Z-index tokens: corregir escala para que toast (500) > nav (100)

> **ESTADO: APLICADO** — commit `93a05e3` en rama `audit/fixes-2026-07-08`

- **ID de referencia:** F003 M1
- **Aplicabilidad:** AUTOMATICO
- **Archivos afectados:** `app/globals.css` (bloque `:root` con variables `--z-*` y bloque `@theme inline` con `--z-index-*`)
- **Fix — sección :root:**

  ```css
  --z-base:            0;
  --z-above:           1;
  --z-sticky:          10;
  --z-nav:             100;
  --z-dropdown:        200;
  --z-modal-backdrop:  300;
  --z-modal:           400;
  --z-toast:           500;
  --z-overlay-max:     9999;
  ```

  Eliminar `--z-fixed`, `--z-popover`, `--z-tooltip` (no están en design.md §19).

- **Fix — sección @theme inline:** actualizar los aliases correspondientes para reflejar los nuevos valores y añadir `--z-index-above: var(--z-above)` y `--z-index-overlay-max: var(--z-overlay-max)`.
- **Verificación:** después del fix, `--z-toast` debe ser mayor que `--z-nav` en la hoja de estilos compilada. Ejecutar `pnpm build` y verificar que no hay errores de CSS.
- **Impacto:** los toasts dejarán de quedar ocultos detrás de la barra de navegación cuando coexistan en pantalla.

---

### FIX-04 · `UserRole` duplicado: importar desde `db-enums.ts` en `AuthenticatedContext.ts`

> **ESTADO: APLICADO** — commit `7714a7a` en rama `audit/fixes-2026-07-08`

- **ID de referencia:** F004 M1
- **Aplicabilidad:** AUTOMATICO
- **Archivos afectados:** `src/infrastructure/tenant/AuthenticatedContext.ts` (línea 7)
- **Fix:** eliminar la línea:

  ```typescript
  export type UserRole = "ADMIN" | "OPERATOR" | "AGENT";
  ```

  Y añadir el import:

  ```typescript
  import type { UserRole } from "@/shared/constants/db-enums";
  ```

- **Verificación:** `pnpm typecheck` debe pasar sin errores. Verificar que todos los consumers que importaban `UserRole` desde `AuthenticatedContext` siguen compilando (buscar `from.*AuthenticatedContext.*UserRole`).
- **Impacto:** fuente única para `UserRole`. Si se añade `VIEWER` en el futuro, una sola edición en `db-enums.ts` lo propaga.

---

### FIX-05 · `VALID_KINDS` local en route: sustituir por `ALLOWED_MEDIA_KINDS` importado

> **ESTADO: APLICADO** — commit `c711816` en rama `audit/fixes-2026-07-08`

- **ID de referencia:** F005 M3
- **Aplicabilidad:** AUTOMATICO
- **Archivos afectados:** `app/api/internal/media/upload/route.ts` (línea 19 y uso en línea 131)
- **Fix:** eliminar:

  ```typescript
  const VALID_KINDS = ["IMAGE_GALLERY", "PLAN", "DOCUMENT"] as const;
  ```

  Añadir import:

  ```typescript
  import { ALLOWED_MEDIA_KINDS } from "@/infrastructure/media/constants";
  ```

  Sustituir el uso:

  ```typescript
  if (!kindField || !ALLOWED_MEDIA_KINDS.includes(kindField as (typeof ALLOWED_MEDIA_KINDS)[number])) {
  ```

- **Verificación:** `pnpm typecheck && pnpm lint` deben pasar. Confirmar que la ruta de upload sigue funcionando con los tres kinds válidos.
- **Impacto:** elimina la duplicidad. Si se añade un kind nuevo en `constants.ts`, la ruta lo hereda automáticamente.

---

### FIX-06 · Eliminar `.eslintignore` deprecated (ESLint v9)

> **ESTADO: APLICADO** — commit `5f6cbbf` en rama `audit/fixes-2026-07-08`

- **ID de referencia:** F003 m6 (transversal X5)
- **Aplicabilidad:** AUTOMATICO
- **Archivos afectados:** `.eslintignore` (eliminar el archivo)
- **Fix:** `rm .eslintignore` — el ignore de `.design-audit/` ya está en `eslint.config.mjs:13` como `globalIgnores([".design-audit/**"])`.
- **Verificación:** `pnpm lint` no debe emitir el warning `"The ".eslintignore" file is no longer supported."`. Confirmar que `.design-audit/` sigue ignorado.
- **Impacto:** elimina el ruido en cada ejecución de lint. Consistencia con ESLint v9 flat config.

---

### FIX-07 · `input.tsx`: añadir `"use client"` (usa `forwardRef` sin directiva)

> **ESTADO: APLICADO** — commit `78ff317` en rama `audit/fixes-2026-07-08`

- **ID de referencia:** F003 m5
- **Aplicabilidad:** AUTOMATICO
- **Archivos afectados:** `src/shared/components/input.tsx` (primera línea)
- **Fix:** añadir como primera línea:

  ```tsx
  "use client";
  ```

- **Verificación:** `pnpm build` debe pasar. En Next.js App Router, el componente debe poder ser importado por Server Components sin errores de ref.
- **Impacto:** coherencia con el patrón del resto de primitivos (`Button`, `Toast`, `MediaImage`). Evita refs silenciosamente nulas en Server Components.

---

### FIX-08 · CI grep check #1: acotar exención a rutas quirúrgicas

> **ESTADO: APLICADO** — commit `a16c527` en rama `audit/fixes-2026-07-08`

- **ID de referencia:** F004 m2 (transversal X6)
- **Aplicabilidad:** AUTOMATICO
- **Archivos afectados:** `.github/workflows/ci.yml` (línea 46)
- **Fix:**

  ```yaml
  # ANTES:
  git ls-files '*.ts' | grep -v '^src/infrastructure/' | ...

  # DESPUÉS:
  git ls-files '*.ts' \
    | grep -vE '^src/infrastructure/tenant/' \
    | grep -vE '^src/infrastructure/db/repositories/' \
    | ...
  ```

- **Verificación:** el CI debe seguir pasando con el código actual (media.service.ts usa SET LOCAL, que es correcto; el check es sobre SET sin LOCAL).
- **Impacto:** nuevos módulos en `src/infrastructure/email/`, `src/infrastructure/slug/`, etc. quedan sujetos al check. Cierra la exención excesivamente amplia.

---

### FIX-09 · RLS `FORCE ROW LEVEL SECURITY` en tablas de dominio

> **ESTADO: PENDIENTE-HUMANO** — requiere migración de BD + decisión sobre rol de aplicación (opción A vs B). No aplicado.

- **ID de referencia:** F002 C2
- **Aplicabilidad:** DECISION HUMANA (migración de BD + decisión de rol de aplicación)
- **Archivos afectados:** nueva migración SQL + `src/infrastructure/db/client.ts`
- **Fix — opción A (mínima, inmediata):** generar una migración de seguimiento con `drizzle-kit generate` o SQL puro:

  ```sql
  ALTER TABLE "promociones" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "unidades" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "leads" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "media_assets" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "lead_history" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "promocion_history" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "consent_records" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "lead_notes" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "lead_read_marks" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "content_blocks" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "promocion_content_blocks" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "tipologias" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "arsop_requests" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "api_keys" FORCE ROW LEVEL SECURITY;
  ALTER TABLE "contact_config" FORCE ROW LEVEL SECURITY;
  ```

- **Fix — opción B (correcta, más trabajo):** crear un rol de aplicación `domio_app` sin `BYPASSRLS`, sin ser propietario de las tablas, y usarlo en `DATABASE_URL` de runtime. Reservar el rol propietario solo para `db:migrate`.
- **Decisión humana:** la opción B requiere cambios en el dashboard de Neon (crear rol, asignar permisos) y potencialmente en Vercel (variable de entorno distinta). Decisión sobre qué opción adoptar.
- **Verificación:** ejecutar la suite de aislamiento (`pnpm test:run tests/isolation/`) contra la BD de test tras aplicar el fix.

---

### FIX-10 · Crear `MediaAssetRepository` y refactorizar `MediaService` para inyectar `TenantContext`

> **ESTADO: PENDIENTE-HUMANO** — refactor estructural que afecta route handler + tests + service; debe coordinarse con F005 (auth-and-session) que está en rama sin mergear. No aplicado.

- **ID de referencia:** F005 C1
- **Aplicabilidad:** DECISION HUMANA (refactor estructural, afecta route handler + tests + service)
- **Archivos afectados:** nuevo `src/infrastructure/db/repositories/media-asset.repository.ts`; modificación de `src/infrastructure/media/media.service.ts` (constructor + 5 métodos); modificación de `app/api/internal/media/upload/route.ts` (instanciación de MediaService); modificación de `tests/unit/media/media.service.test.ts` (setup de mocks)
- **Fix (esquema):**

  ```typescript
  // src/infrastructure/db/repositories/media-asset.repository.ts
  export class MediaAssetRepository extends TenantAwareRepository {
    constructor(ctx: TenantContext) { super(ctx); }
    async insert(values: NewMediaAsset): Promise<MediaAsset> { /* withTransaction */ }
    async findById(id: string): Promise<MediaAsset | undefined> { /* withTransaction */ }
    async findByOwner(ownerId: string, ownerType: string): Promise<MediaAsset[]> { /* withTransaction */ }
    async updateSortOrders(updates: Array<{ id: string; sortOrder: number }>): Promise<void> { /* withTransaction */ }
    async setCover(assetId: string, ownerId: string): Promise<void> { /* withTransaction */ }
    async delete(assetId: string): Promise<void> { /* withTransaction */ }
  }

  // src/infrastructure/media/media.service.ts
  export class MediaService {
    private readonly repo: MediaAssetRepository;
    constructor(private readonly ctx: TenantContext) {
      this.repo = new MediaAssetRepository(ctx);
    }
    // Métodos delegan en this.repo; R2 I/O fuera de transacciones BD
  }
  ```

- **Decisión humana:** el refactor afecta el route handler que instancia `MediaService`. Dependiendo de si F005 (auth-and-session) introduce la sesión Auth.js como `TenantContext`, puede ser conveniente coordinar la instanciación en ese contexto.
- **Verificación:** `pnpm test:run tests/unit/media/ && pnpm build`; confirmar que CI grep check #2 (con FIX-01 aplicado) no detecta queries fuera de repositorios.

---

## 5. Patrones sistémicos transversales

### Patrón A — TDD post-hoc en 4 de 5 features

- Features afectadas: F002, F003, F004, F005
- Evidencia git: commits monolíticos que entregan tests e implementación simultáneamente, sin commit RED previo
- Riesgo para TFM: la metodología SDD con TDD como principio no es demostrable en el historial de commits. Un revisor académico que inspeccione `git log` encontrará cero evidencia de ciclos RED→GREEN
- Recomendación: para las features futuras (F005 auth, F006+), exigir que el tdd-enforcer ejecute en cada tarea y bloquee el merge si no hay commit de test precedente

### Patrón B — Gap del CI grep permitió bypass arquitectónico

- El CI grep check #2 de F004 no detecta `db.transaction()` ni `\.database\.`. F005/F006 exploró ese gap inmediatamente, introduciendo un bypass completo de TenantAwareRepository en el servicio más complejo hasta la fecha. La secuencia exacta (F004 introduce check → F006 introduce bypass → F005 audita y detecta) es un ejemplo textbook de por qué los checks de CI deben ser completos antes del merge, no corregibles después.

---

## 6. Estado de tasks.md en features mergeadas

| Feature | Tareas [X] | Tareas [ ] | Estado |
|---------|-----------|-----------|--------|
| F001 | 0 | ~32 | Sin actualizar |
| F002 | 0 | 32 | Sin actualizar |
| F003 | 0 | 19 | Sin actualizar |
| F004 | 0 | 32 | Sin actualizar |
| F005 | 0 | 29 | Sin actualizar |

Ningún `tasks.md` de feature mergeada refleja el trabajo realizado. Los `tasks.md` son artefactos de evidencia SDD para el TFM; en su estado actual no aportan trazabilidad metodológica.

---

## 7. Recomendación final

**Para el TFM:** aplicar como mínimo FIX-01 (CI check #2), FIX-02 (test:contract), FIX-09 (FORCE RLS) y FIX-10 (MediaAssetRepository) antes de la entrega. Sin FIX-09 y FIX-10, las dos features en ROJO no son defendibles.

**Para calidad de código:** FIX-03 (z-index), FIX-04 (UserRole), FIX-05 (VALID_KINDS), FIX-06 (.eslintignore), FIX-07 (use client) y FIX-08 (CI #1 exención) son cambios de bajo riesgo aplicables en una sesión de 30 minutos.

**Para el ciclo de desarrollo futuro:** configurar `DATABASE_URL` en CI (transversal X4), actualizar `tasks.md` al cerrar cada feature, y exigir commits separados de test antes de implementación.
