# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-09

---

## 1. Executive Summary

**Score:** 80/100 — B+

**Estado general:** Domio es una plataforma SaaS inmobiliaria construida sobre Next.js 15, TypeScript strict, Drizzle ORM y PostgreSQL con RLS. El proyecto tiene más de 26 features entregadas, un diseño de tenant isolation a doble capa (RLS + TenantContext) sólido y una infraestructura de testing que incluye suites de aislamiento RLS, tests de contrato y E2E con Playwright. Mejora respecto a la auditoría anterior (2026-07-09): el bug crítico de producción en el upload route persiste, pero el sistema de auth real (NextAuth) ya está integrado correctamente en todos los demás route handlers internos.

**Fortalezas principales:**
- Tenant isolation a dos capas correctamente ejecutada: RLS en PostgreSQL + `TenantContext.withTransaction` con `SET LOCAL`
- Suite de tests excepcional para la madurez del proyecto: aislamiento RLS, contrato (snapshot con Zod), E2E Playwright y integración contra BD real
- Email decoupled del path crítico mediante `email_queue` persistente con worker de reintento
- Rate limiting con fail-open correcto (`UpstashRateLimiter` con degraded fallback)
- TypeScript strict, ESLint sonarjs, Husky pre-commit/pre-push
- Cursor pagination implementado correctamente en catálogo público y API v1
- Enums cerrados centralizados en `src/shared/constants/db-enums.ts`
- Strategy Pattern para rate limiting (UpstashRateLimiter / NoopRateLimiter) con polimorfismo justificado

**Riesgos principales:**
- **Bug crítico de producción**: `/api/internal/media/upload/route.ts` usa `resolveTenantContext` del sistema legacy, que en producción lanza `ContextResolutionError` (401). Ningún usuario puede subir media en producción.
- `PromocionRepository` de 1.602 líneas acumula seis responsabilidades distintas, con duplicación del objeto de selección de columnas en cinco métodos
- `MediaService` gestiona transacciones manualmente con `SELECT set_config` en lugar de usar `TenantContext.withTransaction`
- `context-middleware.ts` contiene código mock dev-only que nunca debería ejecutarse en producción y debería eliminarse
- N+1 queries en `reorderContentBlocks` y `deleteContentBlock`
- Scan bcrypt O(n) en validación de API keys crece linealmente con el número de keys activas

---

## 2. Arquitectura

### Estado actual

```
app/                    → Next.js App Router (rutas, páginas, API routes)
  (public)/             → Web pública SSR/ISR (catálogo, fichas, home, sobre, contacto)
  (auth)/               → Backoffice autenticado (panel, catalogo, leads, equipo…)
  api/
    v1/                 → API pública versionada (autenticación por API key)
    internal/           → Endpoints internos del backoffice (autenticados por sesión NextAuth)
src/features/           → Módulos de feature (actions, components, hooks, server, schemas)
src/infrastructure/     → Servicios externos (db, auth, email, media, rate-limiting, tenant)
src/shared/             → Código compartido (components, constants, types, utils)
tests/                  → Tests (unit, integration, isolation, contract, e2e)
```

### Fortalezas

- Clara separación entre rutas públicas `(public)` y autenticadas `(auth)`
- `TenantAwareRepository` como base única para todos los repositorios — patrón cohesivo
- Tres contextos de tenant bien diferenciados: `PublicContext`, `AuthenticatedContext`, `ApiKeyContext`
- `AuthenticatedContext.withTransaction` extiende el base añadiendo `SET LOCAL app.current_user_id`, lo que activa las policies RLS por agente sin acoplamiento adicional
- Email desacoplado del path crítico: `email_queue` en la misma transacción del lead, worker con backoff exponencial y `FOR UPDATE SKIP LOCKED`
- Slugs deterministas generados al publicar y persistidos

### Debilidades sistémicas

- **Dos sistemas de autenticación en paralelo**: `context-middleware.ts` (legacy, mock dev-only) y `session.ts` + `require-admin.ts` (NextAuth, producción). El upload route usa el primero, todo lo demás usa el segundo. Este dualismo es la causa directa del bug crítico.
- `PromocionRepository` agrupa seis responsabilidades en 1.602 líneas: CRUD de promociones, CRUD de tipologías y unidades, gestión de content blocks, historial de auditoría, paginación pública con cursor, y paginación del backoffice.
- `MediaService` no usa el patrón establecido (`TenantContext.withTransaction`) — gestiona sus propias transacciones con `this.database.transaction()` y `SELECT set_config` manual. Inconsistencia menor pero relevante si el servicio se extiende.

### Hallazgos de arquitectura

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | Upload route usa sistema de auth legacy en vez de NextAuth | `app/api/internal/media/upload/route.ts` | Crítico |
| A2 | God Object: PromocionRepository (1.602 líneas, 6 responsabilidades) | `src/infrastructure/db/repositories/promocion.repository.ts` | Alto |
| A3 | MediaService no usa `TenantContext.withTransaction` | `src/infrastructure/media/media.service.ts` | Medio |
| A4 | Código mock dev-only activo en contexto de producción | `src/infrastructure/tenant/context-middleware.ts` | Medio |

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] PromocionRepository acumula seis responsabilidades distintas

**Problema:** `PromocionRepository` (1.602 líneas) mezcla en una sola clase:
1. CRUD principal de promociones (`create`, `update`, `findById`, `findAll`)
2. Paginación pública con cursor y precio (`findPublicWithCursor`, `fetchPublicWithPublishedSort`, `fetchPublicWithPriceSort`, `findForApiCursor`)
3. Gestión de tipologías y unidades (`syncTipologiasInTx`, `buildTipologiaCreate`, `buildTipologiaUpdate`, `syncUnidadesInTx`)
4. Gestión de content blocks (`findContentBlock`, `findAllContentBlocks`, `upsertContentBlock`, `deleteContentBlock`, `reorderContentBlocks`, `validateBlocksForPublish`)
5. Historial de auditoría (`getHistory`, `recordFieldChange`)
6. Autoguardado de borrador (`saveDraft`, `discardDraft`)

**Impacto real:** Cualquier cambio en la lógica de content blocks (por ejemplo añadir un nuevo `blockType`) obliga a tocar el mismo fichero donde vive el cursor pagination. El riesgo de regresión es alto y la revisión de PR es costosa porque no hay superficie de cambio acotada.

**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts`

**Impacto:** Alto
**Riesgo futuro:** Alto
**Coste fix:** Medio (4-8h + ajuste de tests)
**Riesgo del refactor:** Medio (hay 90+ tests que dependen del repositorio actual)
**Beneficio esperado:** Alto
**Prioridad:** Planificar

**Acción concreta:** Extraer en orden de menor a mayor riesgo:
1. `PromocionContentBlockRepository` → `src/infrastructure/db/repositories/promocion-content-block.repository.ts` (métodos: `findContentBlock`, `findAllContentBlocks`, `upsertContentBlock`, `deleteContentBlock`, `reorderContentBlocks`, `validateBlocksForPublish`)
2. `PromocionHistoryRepository` → `src/infrastructure/db/repositories/promocion-history.repository.ts` (métodos: `getHistory`, `recordFieldChange`)
3. `PromocionDraftRepository` → se puede mantener en el principal o extraer (métodos: `saveDraft`, `discardDraft`)

Mantener la suite de tests existente verde durante todo el proceso extrayendo en pasos, no de un golpe.

### OCP, LSP, ISP, DIP — Sin violaciones reales

El resto de principios SOLID están bien respetados en el proyecto:
- `RateLimiter` (interface) con `UpstashRateLimiter` y `NoopRateLimiter` — extensión por composición correcta (OCP)
- `TenantContext` como clase abstracta con tres implementaciones coherentes — ninguna rompe el contrato del padre (LSP)
- Interfaces bien ajustadas a sus consumidores (ISP)
- `TenantAwareRepository` recibe `TenantContext` por inyección — DIP respetado

---

## 4. YAGNI

### Código eliminable

| Código | Motivo | Riesgo de eliminar |
|--------|--------|--------------------|
| `src/infrastructure/api-keys/api-key-verifier.ts` | Wrap trivial de `bcrypt.compare` de 20 líneas, no importado en ningún sitio de producción | Muy bajo |
| Constante `EMAIL_STATUS` en `db-enums.ts` (líneas 97-101) | Duplica `EMAIL_STATUSES`. Solo la necesitan `email.repository.ts` y `email.service.ts` y podrían usar `EMAIL_STATUSES[0]` o un tipo literal | Bajo — requiere actualizar 2 ficheros importadores |
| Funciones mock en `context-middleware.ts` (`resolveTenantContext`, `assertDevelopmentOnly`, `MOCK_*`) | Código dev-only que solo usa el upload route (bug). Tras arreglar DT-01, quedan huérfanas | Bajo — ver DT-01 y CS-01 |

### Abstracciones justificadas (no eliminar)

- `NoopRateLimiter` — tiene valor real como fallback en entornos sin Redis
- `TenantAwareRepository` — la herencia es real y eliminarla generaría boilerplate en 8 repositorios
- `ApiKeyContext` / `AuthenticatedContext` / `PublicContext` como clases separadas — el polimorfismo de `withTransaction` es la razón de existir de esta jerarquía

---

## 5. KISS

### Complejidad accidental

- `reorderContentBlocks` emite N UPDATE individuales dentro de una transacción cuando bastaría un único CASE expression. Ver DT-03.
- `findPublicWithCursor` emite un COUNT total incluso cuando llega con cursor. El total ya no es necesario para la navegación con cursor. Ver PERF-03.
- `EMAIL_STATUS` es un objeto literal que repite exactamente los mismos tres strings que `EMAIL_STATUSES`. Un lector nuevo no sabe cuál usar.

### Simplificaciones posibles

1. Extraer `PROMOCION_SELECT_COLUMNS` como constante en `promocion.repository.ts` para eliminar la repetición del objeto de selección en 5 métodos (`findAll`, `findById`, `findDetailBySlug`, `fetchPublicWithPublishedSort`, `fetchPublicWithPriceSort`). Ver CS-02.
2. Crear `requireAuth()` en `src/infrastructure/auth/` siguiendo el patrón ya establecido en `require-admin.ts`. Eliminaría el boilerplate de 3 líneas repetido en cada route handler interno.
3. Eliminar `EMAIL_STATUS` y usar directamente `EMAIL_STATUSES` o literales de tipo.

---

## 6. DRY

### Duplicaciones relevantes

#### [DRY-01] Objeto de selección de columnas repetido en 5 métodos

Cada uno de los métodos `findAll`, `findById`, `findDetailBySlug`, `fetchPublicWithPublishedSort` y `fetchPublicWithPriceSort` declara el mismo objeto de `select({ id: promociones.id, tenantId: promociones.tenantId, slug: promociones.slug, … })` con 20+ campos. Un cambio de schema obliga a actualizar los 5 sitios.

**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts` (5 bloques select idénticos)
**Acción:** Extraer constante `PROMOCION_SELECT_COLUMNS` en la cabecera del fichero.

#### [DRY-02] Patrón auth duplicado en route handlers internos

Los handlers `GET /api/internal/promociones`, `POST /api/internal/promociones`, `GET /api/internal/leads/unread-count` y otros repiten:

```ts
const session = await getServerSession();
if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });
const authCtx = new AuthenticatedContext(session.tenantId, session.userId, session.role);
```

**Archivos afectados:** Al menos 6 route handlers en `app/api/internal/`
**Acción:** Crear `src/infrastructure/auth/require-auth.ts` siguiendo exactamente el patrón de `require-admin.ts`.

### Duplicaciones aceptables (no unificar)

- Los tres `withTransaction` en `TenantContext`, `AuthenticatedContext` y `ApiKeyContext` son extensiones con comportamiento diferente (cada uno añade un `SET LOCAL` distinto). La duplicación aparente es variación intencional.
- Los exists subqueries de tipología en `findPublicWithCursor` (bedrooms, bathrooms, priceMin, priceMax, amenities) son similares entre sí pero cada uno filtra por un campo diferente. Unificarlos en un generador genérico añadiría complejidad sin claridad.

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo | Severidad |
|---|-------|-----------|------|-----------|
| S1 | 1.602 líneas con 6 responsabilidades | `promocion.repository.ts` | God Object | Alta |
| S2 | 5 bloques SELECT idénticos de 20+ campos | `promocion.repository.ts:390,732,768,555,659` | Duplicación DRY | Media |
| S3 | Código mock dev-only en contexto de producción | `context-middleware.ts:14-50` | Dead Code / Speculative Generality | Media |
| S4 | `EMAIL_STATUS` objeto duplica `EMAIL_STATUSES` | `db-enums.ts:97-101` | Duplicación / Lazy Class | Baja |
| S5 | `api-key-verifier.ts` no importado en ningún sitio | `src/infrastructure/api-keys/api-key-verifier.ts` | Dead Code / Middle Man | Baja |
| S6 | URL hardcodeada `https://panel.domio.com/leads` | `create-lead-action.ts:38` | Magic String | Baja |
| S7 | Auth boilerplate repetido en 6+ route handlers | `app/api/internal/**/route.ts` | Duplicación DRY | Baja |
| S8 | N+1 UPDATEs en reorder/delete de content blocks | `promocion.repository.ts:1283-1296, 1309-1321` | N+1 queries | Alta |
| S9 | Scan bcrypt O(n) sobre todas las API keys activas | `api-key-auth.ts:96-110` | Performance Anti-pattern | Media |
| S10 | COUNT emitido siempre aunque no necesario con cursor | `promocion.repository.ts:289-295, 500-505` | Innecesary Query | Baja |

### Clasificación por severidad

- **Alta:** S1, S8
- **Media:** S2, S3, S9
- **Baja:** S4, S5, S6, S7, S10

### Prioridad

- **Hacer de inmediato:** S3 (bug bloqueante), S6, S7
- **Planificar:** S1, S8, S2, S9
- **Posponer:** S4, S5, S10

---

## 8. Testing

### Estado

Infraestructura de tests excepcional para la madurez del proyecto:
- Tests unitarios en `src/features/**/*.spec.ts` (colocados junto al código)
- Tests de integración en `tests/integration/` contra BD real PostgreSQL
- Suite de aislamiento RLS en `tests/isolation/` con dos tenants sintéticos — bloqueante en CI
- Tests de contrato en `tests/contract/v1/` con snapshots Zod — bloqueante en CI
- E2E con Playwright en `tests/e2e/` cubriendo los 5 recorridos principales
- Vitest con `pool: 'forks'`, `singleFork: true` y `fileParallelism: false` — correcto para entorno de desarrollo limitado
- Coverage thresholds en 80% para statements, branches, functions y lines

### Calidad

Los tests más valiosos son los de aislamiento RLS y los de contrato — difíciles de encontrar en proyectos de esta madurez. Los tests de integración contra BD real son irreemplazables para verificar el correcto comportamiento del RLS bajo PgBouncer.

### Hallazgos de testing

| ID | Hallazgo | Prioridad | Coste |
|----|----------|-----------|-------|
| T-01 | Test de upload usa `x-mock-session` (legacy) — no refleja comportamiento en producción | Alta | Bajo |
| T-02 | Falta test de integración para upload con NextAuth mock real | Media | Medio |
| T-03 | Falta test E2E: crear promoción → publicar → verificar SEO metadata y sitemap | Baja | Medio |

---

## 9. Seguridad

### [SEC-CRIT-01] Upload route usa auth mock — 401 en producción para todos los usuarios

**Criticidad:** Crítica
**Archivo:** `app/api/internal/media/upload/route.ts`

**Problema:** `resolveAuthContext()` llama a `resolveTenantContext()` del sistema legacy. En cualquier host distinto de `localhost` con la cabecera `x-mock-session`, `assertDevelopmentOnly` lanza `ContextResolutionError`. En producción, **ningún usuario puede subir imágenes**. El sistema de media es inutilizable en producción.

**Fix:**
```ts
// Reemplazar el bloque try/catch en POST:
import { getServerSession } from "@/infrastructure/auth/session";

const session = await getServerSession();
if (!session) {
  return authRequiredResponse();
}
const context = new AuthenticatedContext(session.tenantId, session.userId, session.role);
```
Eliminar la función `resolveAuthContext` de este archivo. Eliminar los imports de `resolveTenantContext`, `tenantContextStorage` y `ContextResolutionError`. Actualizar el test de integración de upload para usar NextAuth mock en lugar de `x-mock-session`.

---

### [SEC-MED-01] MediaService no usa TenantContext — inconsistencia arquitectónica

**Criticidad:** Media
**Archivo:** `src/infrastructure/media/media.service.ts`

**Problema:** `MediaService` recibe un `tenantId: string` en el constructor en lugar de un `TenantContext`, y gestiona sus propias transacciones con `this.database.transaction()` + `SELECT set_config`. Es funcionalmente correcto hoy, pero:
1. Rompe la invariante arquitectónica de que todo acceso a datos pasa por repositorio context-aware
2. Si se añade lógica que dependa del `userId` (ej. auditación de uploads), habrá que reestructurar
3. La sincronización con Sentry (`syncSentryWithTenant`) no funciona para los uploads porque `tenantContextStorage` no tiene un contexto activo en el flujo del `MediaService`

**Fix:** Refactorizar `MediaService` para recibir `TenantContext` como dependencia y delegar `withTransaction` al contexto en lugar de hacerlo manualmente.

---

### [SEC-LOW-01] URL del backoffice hardcodeada en lógica de negocio

**Criticidad:** Baja
**Archivo:** `src/features/engagement/server/create-lead-action.ts:38`

**Problema:** `const AGENT_NOTIFICATION_BACKOFFICE_URL = "https://panel.domio.com/leads"` está hardcodeada cuando ya existe `AUTH_HOST` en `src/shared/constants/tenant-hosts.ts`.

**Fix:**
```ts
// En src/shared/constants/tenant-hosts.ts añadir:
export const BACKOFFICE_LEADS_URL = `https://${AUTH_HOST}/leads`;

// En create-lead-action.ts reemplazar la constante local por:
import { BACKOFFICE_LEADS_URL } from "@/shared/constants/tenant-hosts";
// y usar BACKOFFICE_LEADS_URL en el payload del email
```

---

## 10. Performance

### [PERF-HIGH-01] N+1 queries en reorderContentBlocks y deleteContentBlock

**Problema:** `reorderContentBlocks` emite un UPDATE individual por cada bloque en el array `orderedBlockIds`. Con 10 bloques son 10 round-trips en la misma transacción. `deleteContentBlock` hace lo mismo al reindexar los bloques restantes. Impacto directo y perceptible en la UX del editor drag-and-drop.

**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts` (líneas 1283-1296 y 1309-1321)

**Fix recomendado:**
```sql
-- Opción 1: CASE expression (un solo UPDATE):
UPDATE promocion_content_blocks
SET sort_order = CASE id
  WHEN '...' THEN 0
  WHEN '...' THEN 1
  ...
END
WHERE id IN (...) AND tenant_id = $tenantId;

-- Opción 2 (más simple): fractional indexing
-- Cambiar sort_order a FLOAT y solo actualizar el bloque movido
-- La reordenación solo emite 1 UPDATE
```

---

### [PERF-MED-01] Scan bcrypt O(n) en validación de API keys

**Problema:** `findMatchingApiKey` carga todas las API keys activas con `SELECT ... WHERE is_active = true` y ejecuta `bcrypt.compare` (≈100ms) sobre cada una. Con 10 keys activas son ≈1s de CPU bloqueado por request autenticado a `/api/v1/`. Con 20 keys son ≈2s. Abre un vector de DoS asistido.

**Archivos afectados:** `src/features/api-public/middleware/api-key-auth.ts:92-110`

**Fix recomendado:** Añadir columna `key_prefix VARCHAR(8)` en `api_keys`. Filtrar por prefijo antes de bcrypt:
```ts
const candidates = await db.select().from(apiKeys).where(
  and(eq(apiKeys.keyPrefix, plaintextKey.slice(0, 8)), eq(apiKeys.isActive, true))
);
// Solo bcrypt.compare sobre 1-2 candidatos
```
Requiere migración de schema + backfill de la columna para keys existentes.

---

### [PERF-LOW-01] COUNT emitido siempre en findPublicWithCursor y findForApiCursor

**Problema:** Se emite un `COUNT(*)` al principio de cada request paginado aunque ya se tenga cursor. Con cursor pagination, el total es informativo pero no necesario para la navegación. Con catálogos grandes, el COUNT puede ser costoso.

**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts` (líneas 289-295, 500-505)

**Fix recomendado:** Omitir el COUNT cuando el parámetro `cursor` esté presente, o cachear el resultado por conjunto de filtros activos.

---

## 11. Deuda Técnica

### Crítica (bloquea producción)

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | Upload route inutilizable en producción — usa auth mock | 1-2h |

### Alta

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-02 | God Object PromocionRepository (1.602 líneas, 6 responsabilidades) | 4-8h |
| DT-03 | N+1 queries en reorderContentBlocks y deleteContentBlock | 2-4h |

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-04 | Scan bcrypt O(n) en API key validation — crece con el número de keys | 3-5h (incluye migración schema) |
| DT-05 | MediaService bypasa TenantContext — inconsistencia arquitectónica | 2-3h |
| DT-06 | Código mock dev-only en context-middleware.ts que nunca debe ejecutarse en producción | 1-2h (tras DT-01) |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-07 | Objeto SELECT de 20+ campos duplicado en 5 métodos del repositorio | 1h |
| DT-08 | Boilerplate auth repetido en 6+ route handlers internos | 1h |
| DT-09 | URL hardcodeada `panel.domio.com/leads` en lógica de negocio | 15min |
| DT-10 | `EMAIL_STATUS` objeto duplica `EMAIL_STATUSES` | 30min |
| DT-11 | `api-key-verifier.ts` sin importadores — dead code | 5min |

---

## 12. Quick Wins

> Cambios menores de menos de 2h, seguros de forma independiente, impacto real.

### QW-01 — Arreglar upload route (~1-2h)

Reemplazar el bloque de auth del `POST` handler en `app/api/internal/media/upload/route.ts` para usar `getServerSession()` en lugar de `resolveAuthContext()`. Eliminar la función local `resolveAuthContext`. Actualizar el test de integración de upload (`tests/integration/media/upload.test.ts`) para eliminar el header `x-mock-session`.

### QW-02 — Crear `requireAuth()` helper (~1h)

Crear `src/infrastructure/auth/require-auth.ts` siguiendo el patrón establecido en `require-admin.ts`. Aplicarlo en los 6+ route handlers internos que repiten el patrón. Reduce 3 líneas de boilerplate a 1 línea en cada handler.

### QW-03 — Mover URL hardcodeada a tenant-hosts.ts (~15min)

Añadir `export const BACKOFFICE_LEADS_URL = ...` en `src/shared/constants/tenant-hosts.ts`. Actualizar `create-lead-action.ts` para importarla.

### QW-04 — Eliminar `api-key-verifier.ts` (~5min)

Borrar `src/infrastructure/api-keys/api-key-verifier.ts`. No tiene importadores. Si hubiera algún test que lo importe directamente, también eliminarlo.

### QW-05 — Eliminar `EMAIL_STATUS` objeto (~30min)

En `db-enums.ts`, eliminar el objeto `EMAIL_STATUS` (líneas 97-101). Actualizar los dos archivos que lo importan (`email.repository.ts` y `email.service.ts`) para usar directamente los literales de tipo `"PENDING" | "SENT" | "FAILED"` o la constante `EMAIL_STATUSES`.

### QW-06 — Extraer `PROMOCION_SELECT_COLUMNS` (~1h)

En la cabecera de `promocion.repository.ts`, definir una constante con el objeto de selección de 20+ campos reutilizado en 5 métodos. Sustituir cada uno de los 5 bloques duplicados por la referencia a la constante.

---

## 13. Refactors Estratégicos

### R-01 — Extraer PromocionContentBlockRepository

**Valor:** Reduce el God Object más crítico. Los content blocks tienen su propio ciclo de vida y sus propias reglas de validación (kind constraint). Aislarlos permite cambiarlos sin riesgo de regresión en el cursor pagination del catálogo.

**Separación propuesta:** Extraer los métodos `findContentBlock`, `findAllContentBlocks`, `upsertContentBlock`, `deleteContentBlock`, `reorderContentBlocks` y `validateBlocksForPublish` a un nuevo `PromocionContentBlockRepository` en `src/infrastructure/db/repositories/promocion-content-block.repository.ts`. Los consumidores actuales (`content-block.actions.ts`, `content.service.ts`) deben instanciar el nuevo repositorio.

**Coste:** 4-6h. **Riesgo de regresión:** Medio — la suite de tests existente detectará cualquier ruptura.

---

### R-02 — Extraer PromocionHistoryRepository

**Valor:** Elimina la segunda responsabilidad oculta del repositorio principal. El historial de auditoría tiene reglas propias (inmutable por RLS, nunca UPDATE/DELETE).

**Separación propuesta:** Extraer `getHistory` y `recordFieldChange` a `PromocionHistoryRepository` en `src/infrastructure/db/repositories/promocion-history.repository.ts`.

**Coste:** 2-3h. **Riesgo de regresión:** Bajo — la interfaz de history es pequeña y sus tests están localizados.

---

### R-03 — Batch UPDATE en reorderContentBlocks y deleteContentBlock

**Valor:** Elimina el N+1 más impactante en UX. El editor drag-and-drop del backoffice lanza estas operaciones con frecuencia.

**Implementación:** Ver PERF-HIGH-01 para las dos opciones (CASE expression o fractional indexing).

**Coste:** 2-4h. **Riesgo de regresión:** Bajo — tests de integración de content blocks cubren el comportamiento observable (ordenación final, no número de queries).

---

### R-04 — Añadir key_prefix para API key validation O(1)

**Valor:** Elimina el scan bcrypt lineal. Con la API pública en producción recibiendo tráfico real, cada request autenticado paga O(n × 100ms).

**Implementación:** Añadir columna `key_prefix VARCHAR(8)` en `api_keys`. Modificar la función de creación de API key para guardar los primeros 8 caracteres de la clave en claro. Modificar `findMatchingApiKey` para filtrar por prefijo antes de bcrypt.

**Coste:** 3-5h (incluye migración de schema y backfill). **Riesgo de regresión:** Bajo — los tests de contrato de la API verifican que la autenticación funciona.

---

### R-05 — Migrar MediaService a TenantContext

**Valor:** Cierra la inconsistencia arquitectónica. Permite que `syncSentryWithTenant` funcione correctamente en el path de upload y habilita auditación de autores de uploads.

**Implementación:** Cambiar la firma del constructor de `MediaService` de `(tenantId: string)` a `(ctx: TenantContext)`. Reemplazar `this.database.transaction(async tx => { await tx.execute(sql\`SELECT set_config...\`); … })` por `ctx.withTransaction(async tx => { … })`.

**Coste:** 2-3h. **Riesgo de regresión:** Bajo — los tests de integración de media cubren el comportamiento observable.

---

## 14. Refactors NO recomendados

### No refactorizar: Simplificar la jerarquía TenantContext

La jerarquía `TenantContext → PublicContext / AuthenticatedContext / ApiKeyContext` podría parecer excesiva para un sistema single-tenant operativo. No tocarla. El polimorfismo de `withTransaction` que añade `SET LOCAL app.current_user_id` en el contexto autenticado activa policies RLS por agente sin acoplar la lógica de negocio. Los tests de aislamiento verifican que funciona correctamente. Simplificarla rompería la segunda línea de defensa que la arquitectura ofrece.

### No refactorizar: Migrar tests de integración a mocks

Los tests de integración contra BD real (`tests/integration/`, `tests/isolation/`) son el activo de calidad más valioso del proyecto. Verifican el comportamiento del RLS y el correcto funcionamiento del patrón `SET LOCAL` bajo PgBouncer, algo que ningún mock puede simular. No sustituirlos por mocks bajo ninguna circunstancia.

### No refactorizar: Migrar a Auth.js v5 ahora

`next-auth@4` está estable en producción y correctamente integrado en todos los route handlers (excepto el bug de upload). La migración a Auth.js v5 es de alto riesgo y bajo valor a corto plazo. Planificar cuando se aproxime el fin de soporte del paquete actual.

### No refactorizar: Introducir DDD entities o Value Objects sobre Drizzle

El modelo de datos ya expresa las invariantes del dominio a través de schemas Zod, enums cerrados en `db-enums.ts` y RLS policies. Añadir una capa de Value Objects o entidades DDD sobre los tipos Drizzle introduciría traducción de tipos sin beneficio tangible para el tamaño y complejidad actual del proyecto.

### No refactorizar: Normalizar PascalCase/kebab-case en nombres de ficheros

Los ficheros de features usan kebab-case (`create-lead-action.ts`) y los de infraestructura usan una mezcla (`TenantAwareRepository.ts`, `ApiKeyContext.ts`). Es inconsistente pero cosmético. El refactor requeriría actualizar importaciones en todo el proyecto con riesgo de introducir errores. El beneficio es puramente estético.

### No refactorizar: Añadir factory para TenantContext

Los tres contextos se construyen directamente en sus puntos de uso (middleware, route handlers, server actions). Un factory añadiría una capa de indirección sin añadir testabilidad ni simplicidad. YAGNI.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)

- [x] [DT-01 / SEC-CRIT-01] Arreglar upload route — reemplazar `resolveAuthContext` por `getServerSession()` y actualizar test de integración de upload — **~1-2h**
- [x] [DT-08 / DRY-02] Crear `requireAuth()` helper y aplicarlo en route handlers internos — **~1h**
- [x] [DT-09 / SEC-LOW-01] Mover `AGENT_NOTIFICATION_BACKOFFICE_URL` a `tenant-hosts.ts` — **~15min**
- [x] [DT-11] Eliminar `src/infrastructure/api-keys/api-key-verifier.ts` — **~5min**
- [x] [DT-10] Eliminar `EMAIL_STATUS` objeto en `db-enums.ts` — **~30min**

### Fase 2 — Corto plazo (próximas 2-4 semanas)

- [x] [DT-06 / CS-01] Limpiar `context-middleware.ts` — eliminar `resolveTenantContext`, `assertDevelopmentOnly`, constantes mock y `tenantContextStorage` (ajustar `sentry-integration.ts` primero) — **~1-2h**
- [x] [DT-07 / DRY-01] Extraer constante `PROMOCION_SELECT_COLUMNS` — **~1h**
- [x] [DT-03 / PERF-HIGH-01] Implementar batch UPDATE en `reorderContentBlocks` y `deleteContentBlock` — **~2-4h**
- [x] [DT-05 / SEC-MED-01] Migrar `MediaService` para recibir `TenantContext` — **~2-3h**
- [x] [R-01] Extraer `PromocionContentBlockRepository` — **~4-6h**

### Fase 3 — Medio plazo (próximo trimestre)

- [x] [R-02] Extraer `PromocionHistoryRepository` — **~2-3h**
- [x] [DT-04 / PERF-MED-01] Añadir `key_prefix` en `api_keys` para validation O(1) — incluye migración de schema y backfill — **~3-5h**
- [x] [PERF-LOW-01] Omitir COUNT en requests con cursor en `findPublicWithCursor` y `findForApiCursor` — **~1h**
- [x] [T-02] Añadir test de integración de upload con NextAuth mock real — **~2h**
- [ ] Planificar migración a Auth.js v5

### No planificado

- Normalización PascalCase/kebab-case en nombres de ficheros — coste > beneficio, puramente cosmético
- Factory pattern para TenantContext variants — YAGNI
- Migración a Auth.js v5 — planificar cuando se aproxime fin de soporte, no ahora

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 7.8 | Clara y coherente, penalizada por God Object y sistema auth legacy activo |
| Simplicidad | 7.2 | N+1 en reorder y scan bcrypt lineal son complejidad evitable |
| Mantenibilidad | 8.0 | Buena organización por features; PromocionRepository monolítico penaliza |
| Cohesión | 7.5 | Módulos de feature cohesivos; PromocionRepository rompe la tendencia |
| Acoplamiento | 8.2 | Dependencias bien dirigidas, sin ciclos detectables |
| Legibilidad | 8.5 | Código bien nombrado, TypeScript strict, comentarios pertinentes |
| Calidad del diseño | 8.0 | Tenant isolation y email async son decisiones de diseño excelentes |
| Testing | 9.0 | Suite de aislamiento RLS y tests de contrato son excepcionales para esta escala |
| Seguridad | 6.5 | Bug crítico de upload pesa mucho; el resto del sistema es sólido |
| Deuda técnica | 7.3 | Manejable salvo el bug crítico; deuda acotada y bien localizada |
| **Total** | **78/100** | |

**Calificación:** B+

**Justificación:** Domio está considerablemente por encima del promedio para su etapa de desarrollo. La infraestructura de testing (especialmente RLS isolation y contrato) y el diseño multi-tenant son ejemplares. Lo que impide el A es el bug crítico de producción en el upload route (ningún usuario puede subir imágenes) y el God Object de PromocionRepository. Con la Fase 1 completa el proyecto sube al menos a A- (88/100). Con la Fase 2 completa, alcanza A (90+).
