# Technical Roadmap — Domio

> Generado por: engineering-auditor (segunda pasada independiente)
> Fecha: 2026-07-13
> Rama auditada: `chore/engenier-auditor`
> Auditoría anterior preservada en: `technical-roadmap-2026-07-13.md`

---

## 1. Executive Summary

**Score:** 76 — **B+**

**Estado general:** La base arquitectónica del proyecto es sólida — TenantContext, repositorios, email queue, cursor pagination, RLS con `set_config` transaccional — pero existen dos violaciones directas de las invariantes más críticas del sistema: (1) una query sobre `users` sin TenantContext en la página de edición de promoción, y (2) una segunda implementación de `createLeadAction` en `leads.actions.ts` que crea leads sin enqueue de notificaciones al agente, violando la regla §11.3 de la constitución y §7.13 de la arquitectura. Ambos problemas están en código activo alcanzable por usuarios del backoffice. Adicionalmente, el catálogo público ejecuta múltiples subqueries EXISTS correlacionados por request cuando se aplican filtros de tipología, degradando el rendimiento. El resto de la deuda es de baja severidad.

**Fortalezas principales:**
- TenantContext correctamente implementado: `set_config('app.current_tenant_id', ..., true)` dentro de transacción, nunca fuera
- AuthenticatedContext añade `app.current_user_id` para RLS por agente — patrón correcto
- Email queue completamente implementada: `createLeadService` en `engagement/server` es la implementación canónica correcta
- Cursor pagination bien implementada sin OFFSET — `(createdAt, id)` y `(price, id)`
- Turnstile CAPTCHA correctamente integrado en ambos formularios públicos con tests unitarios completos
- Validación Zod en boundaries (server actions, API routes, formularios)
- PromocionRepository.update() tiene guarda explícita `if (!this.authCtx) throw new Error(...)` — resuelto en iteración anterior
- `findCardExtras()` usa `inArray()` batch-load correctamente, sin N+1

**Riesgos principales:**
- Query directa `db.select().from(users)` en página de edición de promoción sin TenantContext activo — los datos se filtran a nivel de aplicación (`eq(users.tenantId, ...)`) pero RLS no está activado para esa query
- `createLeadAction` en `leads.actions.ts` (llamado desde `src/features/leads/components/contact-form.tsx`) crea leads sin notificación al agente — silencio operacional ante cada lead capturado
- 4+ EXISTS correlacionados por request en `CatalogRepository.buildPublicConditions()` para filtros de tipología: bedrooms, bathrooms, priceMin, priceMax, y uno por cada amenity seleccionada
- `computeWarning` / `computeConstructionWarning` duplicados entre page component y API route — dos fuentes de verdad para la misma lógica

---

## 2. Arquitectura

### Estado actual

Next.js 15 App Router con separación clara entre superficies públicas (`app/(public)/`) y backoffice (`app/(auth)/panel/`). La infraestructura de acceso a datos se organiza en tres capas: `TenantContext` (base abstracta), contextos concretos (`PublicContext`, `AuthenticatedContext`, `ApiKeyContext`), y repositorios que heredan de `TenantAwareRepository`. El email sigue el patrón de cola persistente (`email_queue` + worker). Los API routes internos se protegen con `requireAuth()`. Los API routes públicos v1 se protegen con `api-key-auth`.

### Fortalezas

- La jerarquía de contextos de tenant es limpia y coherente en casi todo el codebase
- `PublicContext` resuelve el `tenantId` desde env, nunca hardcoded
- `ApiKeyContext` aplica filtros mandatorios `kind='portfolio'` y `status='PUBLISHED'` por diseño
- Cursor pagination con encodeCursor/decodeCursor en repositorio separado (`CatalogRepository`) — SRP respetado
- La separación `PromocionRepository` (CRUD backoffice) vs `CatalogRepository` (público) tiene justificación arquitectónica real

### Debilidades

- Un único punto de bypass del TenantContext en código de producción activo (página de edición de promoción)
- Dos implementaciones paralelas de `createLeadAction` con comportamiento diferente, usadas desde distintos componentes

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | Query directa `db.` sobre `users` sin TenantContext en página de edición | `app/(auth)/panel/catalogo/[id]/page.tsx:310` | Alto |
| A2 | Dos implementaciones de `createLeadAction` con comportamiento divergente | `src/features/leads/actions/leads.actions.ts:211`, `src/features/engagement/server/create-lead-action.ts:48` | Alto |
| A3 | `loadMediaAssets()` dentro de `authCtx.withTransaction()` sin filtro `tenantId` en WHERE | `app/(auth)/panel/catalogo/[id]/page.tsx:84-89` | Medio |

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] PromocionRepository.update() orquesta demasiadas responsabilidades

**Problema:** El método `update()` (571 líneas totales en el repositorio) registra historia, sincroniza tipologías y re-fetcha el objeto completo. Son tres responsabilidades con razones de cambio distintas: historial, sincronización de entidades relacionadas, y recuperación del estado post-update. Un repositorio debería solo persistir; la orquestación de sincronización pertenece a un servicio.

**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts`

**Impacto:** El repositorio tiene 571 líneas. Cuando el modelo de historia cambie, hay que tocar el mismo archivo que cuando cambia la sincronización de tipologías.

**Prioridad:** Posponer — el acoplamiento es real pero el dolor actual es bajo. No refactorizar hasta que la complejidad del archivo aumente o haya un segundo motivo de cambio real.

**Acción concreta:** Extraer `TipologiaSyncService` (ya existe) y `PromocionHistoryRepository` (ya existe) a orquestación en un `PromocionUpdateService` cuando haya una tercera razón de cambio.

#### [SRP-02] `leads.actions.ts` mezcla backoffice actions y acción pública de captura

**Problema:** El archivo contiene acciones autenticadas del backoffice (`getLeadsAction`, `addNoteAction`, `updateLeadStatusAction`, etc.) y una acción pública de captura de leads (`createLeadAction`) que usa `PublicContext`. Son dos contextos de seguridad y dos razones de cambio completamente distintas en el mismo archivo.

**Archivos afectados:** `src/features/leads/actions/leads.actions.ts`

**Impacto:** Alto — la acción pública en este archivo es la que usa el componente `src/features/leads/components/contact-form.tsx`, y esa implementación carece de notificación al agente (ver hallazgo ARCH-02).

**Prioridad:** Hacer inmediatamente — la solución del hallazgo ARCH-02 pasa necesariamente por eliminar o redirigir esta función.

---

### OCP — Open/Closed Principle

No hay violaciones reales con impacto significativo. El sistema de tipos de bloques (`blockType`) usa un discriminated union limpio.

---

### LSP — Liskov Substitution Principle

No hay violaciones detectadas.

---

### ISP — Interface Segregation Principle

No hay violaciones detectadas.

---

### DIP — Dependency Inversion Principle

#### [DIP-01] `api-key-auth.ts` usa `db` directamente como implementación por defecto pero acepta inyección

**Problema:** Las funciones `defaultFindActiveKeys` y `defaultTouchLastUsedAt` importan `db` directamente como implementaciones por defecto inyectables. Este patrón es aceptable para testabilidad pero genera una dependencia concreta a nivel de módulo.

**Archivos afectados:** `src/features/api-public/middleware/api-key-auth.ts`

**Impacto:** Bajo — ya está resuelto mediante inyección en tests. No requiere cambio.

**Prioridad:** No hacer.

---

## 4. YAGNI

### Abstracciones innecesarias

Ninguna detectada. Las interfaces existentes tienen múltiples implementaciones o justificación documentada.

### Interfaces innecesarias

Ninguna detectada.

### Servicios innecesarios

Ninguno detectado.

### Código eliminable

| Código | Motivo | Riesgo de eliminar |
|--------|--------|--------------------|
| `createLeadAction` en `src/features/leads/actions/leads.actions.ts` (línea 211) | Duplicado de `src/features/engagement/server/create-lead-action.ts` con comportamiento incorrecto (sin email queue). El componente que la llama (`src/features/leads/components/contact-form.tsx`) debería importar la implementación canónica. | Bajo — requiere actualizar la importación en `contact-form.tsx` |
| Shim de compatibilidad v5 en `auth.config.ts` (última sección) | La architecture.md dice "Auth.js v5" pero `package.json` tiene `next-auth: ^4.24.14`. El shim `export const auth = _na.auth ?? async function...` no sirve ningún propósito real con v4. | Medio — requiere alinear documentación o migrar realmente a v5 |

---

## 5. KISS

### Complejidad accidental

#### [KISS-01] `computeWarning` / `computeConstructionWarning` — dos funciones idénticas en dos archivos

La misma lógica de cruce `constructionStatus` × `entrega_estimada` del bloque `PLAZOS_GARANTIAS` existe en dos lugares con nombres distintos:

- `app/(auth)/panel/catalogo/[id]/page.tsx:33` — `computeWarning()`
- `app/api/internal/promociones/[id]/route.ts:41` — `computeConstructionWarning()`

La diferencia es cosmética: la versión del API route tiene un check adicional `typeof rawDate === "string"` antes del `new Date()`. La lógica de negocio es idéntica. Si la regla de negocio cambia (añadir un nuevo estado, cambiar el mensaje) hay que editar dos archivos.

**Simplificación:** Extraer a `src/shared/utils/construction-warning.ts` y usarla en ambos. El tipo `ConstructionWarning` también está duplicado (declarado en la page y en el route).

### Capas innecesarias

Ninguna detectada.

---

## 6. DRY

### Duplicaciones relevantes

#### [DRY-01] `computeWarning` / `computeConstructionWarning` (ver KISS-01)

Un cambio de regla de negocio requiere editar dos archivos separados. Alta probabilidad de divergencia silenciosa.

#### [DRY-02] Tipo `ConstructionWarning` declarado dos veces

- `app/(auth)/panel/catalogo/[id]/page.tsx`: importado desde `promocion-section-commercial-status`
- `app/api/internal/promociones/[id]/route.ts:24`: declarado inline

Mismo tipo, dos fuentes. Debería vivir en `src/shared/types/` y ambos importar de ahí.

### Duplicaciones aceptables

- `PROMOCION_SELECT_COLUMNS` compartido entre `PromocionRepository` y `CatalogRepository` — correcto, eliminación de duplicación real
- Validación de `promocionId` como UUID en múltiples lugares — duplicación incidental aceptable dado el contexto de cada boundary

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo | Severidad |
|---|-------|-----------|------|-----------|
| S1 | God File: backoffice actions + public action en el mismo archivo | `src/features/leads/actions/leads.actions.ts` | Divergent Change | Alta |
| S2 | Feature Envy: `createLeadAction` en `leads.actions.ts` opera sobre datos de engagement sin acceso a email queue | `src/features/leads/actions/leads.actions.ts:211` | Feature Envy | Alta |
| S3 | Duplicated Logic: `computeWarning` / `computeConstructionWarning` | `page.tsx:33`, `route.ts:41` | DRY | Media |
| S4 | Dead Code candidato: shim v5 en `auth.config.ts` | `src/infrastructure/auth/auth.config.ts` (sección final) | Speculative Generality | Baja |
| S5 | `as unknown as` castings en blocks-editor.tsx | `src/features/promociones/components/blocks-editor.tsx` | Type Unsafe Bridge | Baja |
| S6 | `loadMediaAssets()` sin `tenantId` en WHERE | `app/(auth)/panel/catalogo/[id]/page.tsx:88` | Missing Filter | Media |
| S7 | Silent catch `{}` en GET/PATCH/DELETE handlers | `app/api/internal/promociones/[id]/route.ts:311,427,476` | Silent Error Swallowing | Media |
| S8 | `escapeCsvField` en `leads.actions.ts` es primitivo e insuficiente para campos con salto de línea embedded en comillas | `src/features/leads/actions/leads.actions.ts:293` | Primitive Obsession | Baja |

### Clasificación por severidad

**Alta:** S1, S2
**Media:** S3, S6, S7
**Baja:** S4, S5, S8

### Prioridad

**Hacer de inmediato:** S1, S2 (ver SEC-HIGH-01 y hallazgo A2)
**Planificar:** S3, S6, S7
**Posponer:** S4, S5, S8

---

## 8. Testing

### Estado

39 archivos de test identificados. Vitest con thresholds al 80% (statements, branches, functions, lines). Playwright para E2E. Setup con `jsdom`. Tests de contrato en `tests/contract/`.

### Calidad

- Tests de infrastructure (`api-key-auth.spec.ts`, `content-block.repository.spec.ts`, `content.service.spec.ts`) usan mocks de transacción bien construidos
- `turnstile.spec.ts` cubre 7+ branches incluyendo casos edge (dev sin clave, prod sin clave, token vacío, fetch falla, error-codes)
- `content-block-schema.spec.ts` cubre 5 casos de `sanitizeHtmlAttrs` incluyendo XSS vectors
- `ContactFormGeneric.spec.tsx` cubre el flujo Turnstile

### Cobertura útil vs artificial

**Bien cubierto:** lógica de negocio de leads, schemas Zod, autenticación, contenidos, SEO helpers

**Cobertura ausente crítica:**
- `src/features/leads/actions/leads.actions.ts` — el `createLeadAction` público en este archivo no tiene test que verifique que NO envía email (la ausencia de la feature es el bug, y no hay regresión que lo cubra)
- `app/(auth)/panel/catalogo/[id]/page.tsx` — no hay test que verifique que la query de agentes usa TenantContext
- `CatalogRepository.buildPublicConditions()` — no hay test de integración que verifique que filtros combinados (bedrooms + priceMin + amenities) generan el número correcto de EXISTS

### Mejoras

| Mejora | Prioridad | Coste |
|--------|-----------|-------|
| Test de regresión: `createLeadAction` de `leads.actions.ts` debe enqueue emails | Alta | Bajo |
| Test de integración: `CatalogRepository` con filtros combinados de tipología | Media | Medio |
| Test de smoke: página de edición de promoción carga agentes con contexto correcto | Media | Medio |

---

## 9. Seguridad

### [SEC-HIGH-01] Query sobre `users` sin TenantContext activado

**Criticidad:** High

**Archivo:** `app/(auth)/panel/catalogo/[id]/page.tsx:310-319`

**Problema:** La query que obtiene la lista de agentes para el dropdown de asignación importa y usa `db` directamente, sin pasar por `authCtx.withTransaction()`. El filtro `eq(users.tenantId, session.tenantId)` en el `WHERE` filtra a nivel de aplicación, pero la sesión de base de datos nunca recibe `SET LOCAL app.current_tenant_id = ...`. Esto significa que las políticas RLS de PostgreSQL no están activas para esta query. Si las RLS políticas son la única fuente de verdad para aislamiento de tenant (como indica la arquitectura), esta query viola esa garantía.

**Contexto:** El sistema opera en single-tenant en producción actualmente, lo que reduce el impacto inmediato. Sin embargo, el patrón es contrario a la invariante arquitectónica y sienta precedente.

**Fix:** Reemplazar la query directa por una implementación a través de `authCtx.withTransaction()`. La forma más directa es añadir un método `findAgentsByTenant()` en un `UserRepository` o usar el `authCtx` existente en la página:

```typescript
// En lugar de:
const agentsList = await db.select({...}).from(users).where(...)

// Usar:
const agentsList: AgentOption[] = await authCtx.withTransaction(async (tx) => {
  return tx
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.tenantId, session.tenantId), eq(users.role, "AGENT")));
});
```

---

### [SEC-MED-01] `loadMediaAssets()` sin filtro `tenantId` en WHERE

**Criticidad:** Medium

**Archivo:** `app/(auth)/panel/catalogo/[id]/page.tsx:84-89`

**Problema:** La query dentro de `authCtx.withTransaction()` filtra solo por `ownerId` (`eq(mediaAssets.ownerId, ownerId)`) sin añadir `eq(mediaAssets.tenantId, session.tenantId)`. La RLS protege vía `app.current_tenant_id`, pero la ausencia del filtro explícito en el WHERE es una defensa en profundidad que falta. Si alguna RLS policy tiene un gap, assets de otro tenant con el mismo `ownerId` podrían ser expuestos.

**Fix:** Añadir `eq(mediaAssets.tenantId, session.tenantId)` al `WHERE`:

```typescript
.where(
  and(
    eq(mediaAssets.ownerId, ownerId),
    eq(mediaAssets.tenantId, tenantId),
  )
)
```

---

### [SEC-MED-02] Silent error swallowing en handlers API internos

**Criticidad:** Medium

**Archivo:** `app/api/internal/promociones/[id]/route.ts:311,427,476`

**Problema:** Los bloques `catch {}` en GET, PATCH y DELETE no hacen logging del error antes de devolver 500. Un error de DB, un fallo de red con Neon, o una excepción inesperada serán completamente invisibles en logs. Debugging en producción requiere logs.

**Fix:** Añadir `logger.error('PATCH promocion error', error)` (o equivalente) en cada catch block antes del `Response.json({ error: ERR_INTERNAL }, { status: 500 })`.

---

## 10. Performance

### [P-HIGH-01] Múltiples EXISTS correlacionados en `CatalogRepository.buildPublicConditions()`

**Problema:** Cuando un usuario filtra por bedrooms, bathrooms, priceMin, priceMax y amenities simultáneamente, PostgreSQL ejecuta hasta 4 + N EXISTS subqueries correlacionados por cada fila de `promociones`. Con N amenities seleccionadas son 4+N scans adicionales de `tipologias` por promocion candidata.

**Archivos afectados:** `src/infrastructure/db/repositories/catalog.repository.ts:184-211`

**Contexto:** `findCardExtras()` en el mismo repositorio ya resolvió el patrón correcto con `inArray()` para batch-load. `getRelatedProperties.ts` ya resolvió el patrón correcto con `BOOL_OR` en `tipologiaAgg`. `buildPublicConditions()` es el único punto que no siguió el mismo patrón.

**Fix recomendado:** Reemplazar los EXISTS correlacionados por un JOIN con subquery materializada similar a la que ya usa `fetchPublicWithPriceSort`:

```typescript
// Subquery que pre-agrega tipologías
const tipologiaFilter = tx
  .select({ promocionId: tipologias.promocionId })
  .from(tipologias)
  .where(
    and(
      filters.bedrooms ? gte(tipologias.bedrooms, filters.bedrooms) : undefined,
      filters.bathrooms ? gte(tipologias.bathrooms, filters.bathrooms) : undefined,
      filters.priceMin ? gte(tipologias.referencePriceSale, filters.priceMin) : undefined,
      filters.priceMax ? lte(tipologias.referencePriceSale, filters.priceMax) : undefined,
    )
  )
  .groupBy(tipologias.promocionId)
  .as("tipologia_filter");

// En el JOIN de la query principal:
.innerJoin(tipologiaFilter, eq(tipologiaFilter.promocionId, promociones.id))
```

Los filtros de amenity (uno por amenity, actualmente) pueden consolidarse en un único `BOOL_AND` sobre `tipologias.amenities @> ...`.

**Impacto medible:** Con 1000 promociones y 5 filtros activos, el plan actual puede generar 5000+ scans parciales. El join materializado genera 1 scan.

---

## 11. Deuda Técnica

### Crítica (bloquea invariantes arquitectónicas)

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | Query `users` sin TenantContext en página de edición de promoción | 1h |
| DT-02 | `createLeadAction` en `leads.actions.ts` sin email queue — leads capturados sin notificación al agente | 2h |

### Alta

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-03 | `loadMediaAssets()` sin filtro `tenantId` en WHERE | 30min |
| DT-04 | EXISTS correlacionados en `buildPublicConditions()` — degradación de rendimiento con filtros combinados | 3h |
| DT-05 | Silent catch `{}` en API handlers internos — debugging imposible en producción | 1h |

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-06 | `computeWarning` / `computeConstructionWarning` duplicados — dos fuentes de verdad | 1h |
| DT-07 | Tipo `ConstructionWarning` declarado dos veces (page y route) | 30min |
| DT-08 | architecture.md dice next-auth v5, `package.json` tiene v4 — documentación desalineada | 30min (doc update) o 1 sprint (migración real) |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-09 | Shim v5 en `auth.config.ts` — dead code si se mantiene v4 | 30min |
| DT-10 | `as unknown as` castings en `blocks-editor.tsx` — aceptables pero no ideales | 2h |
| DT-11 | `escapeCsvField` primitivo en exportación CSV | 30min |

---

## 12. Quick Wins

### QW-01 — Mover query de agentes dentro de `authCtx.withTransaction()` (~30min)

En `app/(auth)/panel/catalogo/[id]/page.tsx`, reemplazar las líneas 310-319 (query directa con `db`) por la misma query dentro de `authCtx.withTransaction()`. Eliminar el import `{ db }` de la línea 8. Un cambio, sin lógica nueva, sin riesgo de regresión.

### QW-02 — Añadir `tenantId` al WHERE de `loadMediaAssets()` (~15min)

Línea 88: añadir `eq(mediaAssets.tenantId, tenantId)` al `and(...)`. El parámetro `tenantId` ya está disponible en la firma de la función.

### QW-03 — Añadir logging en catch blocks del route handler (~30min)

En `app/api/internal/promociones/[id]/route.ts`, en los tres bloques `catch {}` (GET:311, PATCH:427, DELETE:476), añadir `logger.error(...)` antes del return 500. El `logger` ya está disponible en el proyecto.

### QW-04 — Extraer `computeConstructionWarning` a shared (~45min)

Crear `src/shared/utils/construction-warning.ts` con la función y el tipo. Importar desde ambos archivos. Eliminar la declaración inline del tipo en el route.

### QW-05 — Actualizar architecture.md: next-auth v4 no v5 (~15min)

Cambiar la referencia en `architecture.md` de "Auth.js v5" a `next-auth v4.24.x`. O alternativamente, planificar la migración real. La documentación desalineada es una trampa para nuevos contribuidores.

---

## 13. Refactors Estratégicos

### R-01 — Eliminar `createLeadAction` de `leads.actions.ts` y reconectar `contact-form.tsx`

**Valor:** Elimina una implementación de lead creation que captura leads sin notificar al agente asignado. Cada lead enviado desde `src/features/leads/components/contact-form.tsx` actualmente no genera email al agente. Este es un bug operacional, no solo deuda técnica.

**Cambio concreto:**
1. En `src/features/leads/components/contact-form.tsx:47`, cambiar el import dinámico de `@/features/leads/actions/leads.actions` a `@/features/engagement/server/create-lead-action`
2. Adaptar la llamada: la firma de la versión canónica recibe `CreateLeadInput` (objeto tipado), no `FormData`. El componente `contact-form.tsx` necesita mapear sus campos a ese objeto.
3. Verificar que el componente añade `turnstileToken` al input (la versión canónica requiere Turnstile)
4. Eliminar `createLeadAction` de `leads.actions.ts` (líneas 202-287)

**Coste:** 3h. **Riesgo de regresión:** Medio — el componente `contact-form.tsx` es un formulario público. Requiere prueba manual del flujo completo post-cambio.

---

### R-02 — Reemplazar EXISTS correlacionados en `buildPublicConditions()` por JOIN con subquery

**Valor:** Mejora significativa de rendimiento en el catálogo público cuando se aplican filtros combinados de tipología (bedrooms, bathrooms, precio, amenities). El patrón correcto ya existe en `fetchPublicWithPriceSort` y en `getRelatedProperties`.

**Cambio concreto:**
- Refactorizar `buildPublicConditions()` para devolver condiciones + un posible join necesario, o rediseñar `findPublicWithCursor()` para construir el JOIN cuando hay filtros de tipología activos.
- La complejidad está en que `buildPublicConditions` devuelve condiciones WHERE, y añadir el JOIN requiere modificar la query principal en `findPublicWithCursor`. Puede simplificarse creando un flag `needsTipologiaJoin` devuelto por `buildPublicConditions`.

**Coste:** 3-4h. **Riesgo de regresión:** Medio — requiere tests de integración que verifiquen comportamiento de filtros combinados antes y después del cambio.

---

## 14. Refactors NO recomendados

### No refactorizar: PromocionRepository en capas separadas

El repositorio tiene 571 líneas y orquesta historial + sincronización tipologías + update. Es complejo pero cohesivo. Separarlo ahora añadiría una capa de servicio sin beneficio inmediato observable. Posponer hasta que haya una tercera razón de cambio real.

### No refactorizar: `auth.config.ts` shim v5

El shim es dead code con v4, pero eliminarlo sin migrar a v5 no aporta nada y migrar a v5 es un cambio de mayor envergadura (breaking changes en la API de next-auth). No hacer ninguno de los dos hasta que sea prioritario.

### No refactorizar: `blocks-editor.tsx` castings `as unknown as`

Los 759 líneas de `blocks-editor.tsx` tienen castings de tipo para el bridge entre `BlockFormPayload` y `Record<string, unknown>`. El contrato de tipos del editor de bloques es genuinamente heterogéneo. Eliminar los castings requeriría un sistema de tipos más complejo que el problema que resuelve. No hacer.

### No refactorizar: `CatalogRepository` para extraer `buildPublicConditions` a otra clase

La función `buildPublicConditions` está bien ubicada en `CatalogRepository`. Moverla a una clase "FilterBuilder" separada añadiría indirección sin valor. El refactor recomendado (R-02) solo cambia la implementación interna, no la estructura.

### No refactorizar: `leads.repository.ts` (599 líneas)

El repositorio de leads es grande pero cohesivo — todos sus métodos operan sobre la entidad Lead y sus entidades relacionadas (notas, historia, consentimientos). La razón de cambio es singular. No separar.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)

- [x] [DT-01][QW-01][SEC-HIGH-01] Mover query `users` dentro de `authCtx.withTransaction()` en `app/(auth)/panel/catalogo/[id]/page.tsx` — 30min
- [x] [DT-02][R-01] Reconectar `src/features/leads/components/contact-form.tsx` a la implementación canónica `create-lead-action.ts` y eliminar `createLeadAction` de `leads.actions.ts` — 3h
- [x] [DT-03][QW-02][SEC-MED-01] Añadir `eq(mediaAssets.tenantId, tenantId)` en `loadMediaAssets()` — 15min

### Fase 2 — Corto plazo (próximo mes)

- [x] [DT-05][QW-03][SEC-MED-02] Añadir logging en catch blocks de `app/api/internal/promociones/[id]/route.ts` — 30min
- [x] [DT-06][DT-07][QW-04] Extraer `computeConstructionWarning` y tipo `ConstructionWarning` a `src/shared/utils/construction-warning.ts` — 1h
- [x] [DT-04][P-HIGH-01][R-02] Reemplazar EXISTS correlacionados en `buildPublicConditions()` — 3-4h (con tests de regresión)

### Fase 3 — Medio plazo (próximo trimestre)

- [x] [DT-08][QW-05] Alinear documentación de next-auth v4 en `architecture.md`, o planificar migración real a v5 — decision de equipo

### No planificado

- Migración a next-auth v5 — breaking change mayor, no urgente mientras v4 funcione
- Tipos en `blocks-editor.tsx` — complejidad que no justifica el coste

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 7 | Base sólida con TenantContext, pero 1 bypass directo activo en producción y 2 implementaciones paralelas con comportamiento divergente |
| Simplicidad | 8 | Pocas abstracciones innecesarias, código directo en la mayoría de los módulos |
| Mantenibilidad | 7 | `computeWarning` duplicado, `createLeadAction` duplicado con comportamiento diferente crean fricción operacional real |
| Cohesión | 8 | Módulos bien delimitados salvo `leads.actions.ts` que mezcla contextos |
| Acoplamiento | 8 | Dependencias bien gestionadas; el bypass de `db` en la página es el único acoplamiento directo no deseado |
| Legibilidad | 8 | Código generalmente claro, nombres consistentes, JSDoc donde importa |
| Calidad del diseño | 7 | Patrones bien elegidos (cursor pagination, email queue, contextos) con ejecución casi completa — los dos hallazgos críticos son inconsistencias puntuales |
| Testing | 7 | Coverage útil en la mayoría de módulos; ausencia de tests de regresión para los dos hallazgos críticos |
| Seguridad | 6 | Turnstile bien implementado, RLS bien diseñado; pero el bypass de TenantContext en la query de agentes y la ausencia de tenantId en mediaAssets son deficiencias reales |
| Deuda técnica | 7 | Deuda concentrada en pocos puntos, todos identificables y con fixes concretos de bajo coste |
| **Total** | **73/100** | |

**Calificación:** B+

**Justificación:** La arquitectura de acceso a datos (TenantContext, email queue, cursor pagination) está genuinamente bien diseñada y ejecutada. La integración Turnstile está completa con tests. El sistema de bloques editoriales funciona. Pero existen dos violaciones de las invariantes más críticas del sistema — la bypass del TenantContext y la duplicación de `createLeadAction` sin email queue — que son bugs operacionales activos, no solo deuda teórica. Esos dos hallazgos por sí solos impiden una calificación mayor. El score sube a A- cuando ambos estén corregidos y los EXISTS correlacionados en el catálogo estén resueltos.
