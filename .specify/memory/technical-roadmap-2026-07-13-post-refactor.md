# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-13
> Rama auditada: main (auditoría independiente)

---

## 1. Executive Summary

**Score:** 85 — **A-**

**Estado general:** Domio es una plataforma inmobiliaria multi-tenant bien construida sobre Next.js 15, React 19, Drizzle ORM y PostgreSQL con PostGIS. El proyecto demuestra madurez técnica significativa: multi-tenancy con RLS a nivel de base de datos, testing multicapa (unit, integration, contract, E2E, isolation), rate limiting con graceful degradation, email queue transaccional, y contract tests para la API pública. Los ~48K líneas de código TypeScript están organizadas en una arquitectura feature-based limpia. Los problemas principales son de escala local: dos repositorios que han crecido más allá de lo recomendable (559 y 593 líneas), dos componentes UI excesivamente grandes (507 y 547 líneas), y duplicación menor de literales y lógica CSV. No hay problemas de seguridad críticos ni de arquitectura sistémica.

**Fortalezas principales:**
- Multi-tenant DNA rigurosamente implementado: `TenantContext` → `TenantAwareRepository` → transacción con `SET LOCAL` + RLS policies. Tres contextos concretos (Public, Authenticated, ApiKey) con filtros obligatorios a nivel de repositorio.
- Testing maduro y bloqueante: unit, integration, isolation (tenant), contract (snapshots), E2E (Playwright con POM). Los tests de aislamiento tenant son bloqueantes en CI.
- Security-first sin drama: rate limiting en login y API pública con graceful degradation, API keys con bcrypt + prefix filtering, validación Zod en todos los boundaries de entrada, Sentry con sanitización de secrets, RLS en todas las tablas.
- API pública versionada con contract tests — la ruptura de schema es bloqueante en CI.
- Email queue transaccional consistente: tanto leads comerciales como institucionales usan `EmailService.enqueue()` dentro de la misma transacción que el INSERT del lead.
- Cursor pagination donde importa (catálogo backoffice, API pública, catálogo público).

**Riesgos principales:**
- `PromocionRepository` (559 líneas) y `LeadRepository` (593 líneas) han acumulado múltiples responsabilidades y se acercan al techo de mantenibilidad.
- Dos componentes UI (`lead-detail.tsx` 507 líneas, `promocion-form.tsx` 547 líneas) mezclan presentación, estado y lógica de negocio.
- Duplicación de lógica CSV entre `arsop.repository.ts` y `leads.actions.ts`.
- `KIND_LABELS` duplicado literalmente en tres componentes sin centralizar.
- `MediaService.reorderGallery` ejecuta N UPDATEs en loop cuando podría ser un batch UPDATE.

---

## 2. Arquitectura

### Estado actual

```
app/(public)/         → Web pública comercial (SSR/ISR, PublicContext)
app/(auth)/panel/     → Backoffice (AuthenticatedContext, sesión JWT)
app/api/v1/           → API pública versionada (ApiKeyContext, rate limit)
app/api/internal/     → Endpoints del backoffice (requireAuth/requireAdmin)

src/features/         → 14 módulos: catalog, promociones, leads, engagement,
                        contact, contenidos, seo, home, detail, favorites,
                        api-public, api-keys, backoffice, team
src/infrastructure/   → DB (Drizzle + 13 repositorios), auth (NextAuth v4),
                        email (queue + worker), media (R2/S3), rate-limiting
                        (Upstash Redis), tenant (3 contextos), slug, observability
src/shared/           → Tipos, constantes, schemas Zod, componentes UI base,
                        utils, styles
```

**Patrón central:** `TenantContext → TenantAwareRepository → transacción con SET LOCAL app.current_tenant_id`. Los tres contextos concretos (PublicContext, AuthenticatedContext, ApiKeyContext) aplican filtros obligatorios a nivel de repositorio, no de endpoint. Este patrón se respeta con disciplina en todo el código.

### Fortalezas

- **Tres superficies de acceso bien aisladas** con mecanismos de autenticación diferentes y sin solapamiento: sesión JWT para backoffice, API key para pública v1, sin auth para web pública (con filtros `status=PUBLISHED`).
- **Resiliencia a fallos externos:** email encolado en transacción (nunca se pierde un email si Resend cae), rate limiting con degraded mode (permite tráfico si Redis falla), Turnstile con bypass en dev y alerta en producción.
- **Tests de aislamiento tenant bloqueantes en CI** — garantía formal del modelo multi-tenant.
- **Contract tests con snapshots** para la API pública — ruptura de schema es bloqueante.
- **Environment validation con proxies** (`tenantEnv`, `mediaEnv`) — fail-fast en startup si faltan variables críticas.
- **DB client con lazy initialization** via Proxy — evita errores de importación circular y garantiza un solo Pool de conexiones.

### Debilidades

- **Repositorios que han crecido más allá de lo recomendable.** `PromocionRepository` (559 líneas) mezcla CRUD, history recording, tipologías sync, cursor pagination y detail assembly. `LeadRepository` (593 líneas) mezcla lecturas multi-rol, escrituras, notas, read marks, reassign y export CSV.
- **No hay service layer formal** entre los route handlers de `app/api/internal/` y los repositorios, excepto para `PromocionPublishService` y `ContentService`. El patrón no se ha propagado a leads, team, ni media.
- **Dos sistemas paralelos de content blocks:** `promocionContentBlocks` (bloques editoriales dentro de una promoción) y `contentBlocks` (bloques de páginas públicas como home/contacto). Tienen repositorios separados pero patrones de upsert/historial similares.
- **Componentes UI excesivamente grandes** que mezclan presentación, estado local y lógica de negocio.

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | `PromocionRepository` acumula CRUD + history + tipologías + cursor + detail | `src/infrastructure/db/repositories/promocion.repository.ts` | Alto |
| A2 | `LeadRepository` acumula lecturas multi-rol + escrituras + notas + read marks + CSV | `src/infrastructure/db/repositories/lead.repository.ts` | Alto |
| A3 | Dos sistemas paralelos de content blocks con patrones similares | `promocion-content-block.repository.ts`, `content-block.repository.ts` | Medio |
| A4 | Service layer inconsistente — solo 2 de ~10 features tienen service | `src/features/*/server/` | Medio |

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] PromocionRepository — God Object
**Problema:** 559 líneas con 5 responsabilidades distintas: (1) CRUD de promociones, (2) cursor pagination con filtros, (3) field-level history recording, (4) tipologías sync via TipologiaSyncService, (5) detail assembly con tipologías + unidades. Cada una tiene razones de cambio independientes.
**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts`
**Impacto:** Alto. El repositorio es difícil de testear de forma aislada, y un cambio en la lógica de history puede romper la pagination. La clase tiene 15+ métodos privados que apoyan responsabilidades diferentes.
**Prioridad:** Planificar
**Acción concreta:** Extraer `PromocionHistoryRecorder` (recordHistory + HISTORY_FIELDS) y `PromocionCursorQuery` (findAllWithCursor + buildFilterConditions). El repositorio principal queda con CRUD + findById + create + update + delete.

#### [SRP-02] LeadRepository — God Object
**Problema:** 593 líneas con 6 responsabilidades: (1) listado paginado con filtros multi-rol, (2) CRUD de leads, (3) notas, (4) read marks (markAsRead, getUnreadCount, getUnreadLeadIds, isLeadReadByUser), (5) reassign con cascade delete de read marks, (6) export CSV con generación de contenido.
**Archivos afectados:** `src/infrastructure/db/repositories/lead.repository.ts`
**Impacto:** Alto. La lógica de read marks (4 métodos) podría ser su propio repositorio. La generación de CSV no pertenece en un repositorio.
**Prioridad:** Planificar
**Acción concreta:** Extraer `LeadReadMarkRepository` (markAsRead, getUnreadCount, getUnreadLeadIds, isLeadReadByUser). Mover la generación de CSV a un `LeadExportService` o utility function.

#### [SRP-03] lead-detail.tsx — Componente con múltiples responsabilidades
**Problema:** 507 líneas que mezclan: (1) fetch de datos del lead, (2) gestión de estado local (notas, historial, status transitions), (3) UI de detalle con tabs, (4) formularios de notas y reasignación, (5) lógica de permisos por rol.
**Archivos afectados:** `src/features/leads/components/lead-detail.tsx`
**Impacto:** Medio-Alto. Difícil de testear, difícil de reutilizar, cada cambio de UI requiere entender toda la lógica de negocio.
**Prioridad:** Planificar
**Acción concreta:** Extraer hooks personalizados (`useLeadDetail`, `useLeadNotes`, `useLeadStatusTransitions`) y sub-componentes para cada tab.

#### [SRP-04] promocion-form.tsx — Componente con múltiples responsabilidades
**Problema:** 547 líneas que mezclan: (1) estado del formulario con autosave, (2) validación de publish, (3) UI de secciones (identity, location, SEO, commercial, agent), (4) gestión de drafts, (5) tipologías y unidades anidadas.
**Archivos afectados:** `src/features/promociones/components/promocion-form.tsx`
**Impacto:** Medio-Alto. Similar a lead-detail.tsx.
**Prioridad:** Planificar
**Acción concreta:** Extraer hooks (`usePromocionForm`, `useAutosave`, `usePublishValidation`) y sub-componentes por sección (ya parcialmente hechos con `promocion-section-*`).

### OCP — Open/Closed Principle

No hay violaciones significativas. El sistema de content blocks con schema registry (`block-schema-registry.ts`) es un buen ejemplo de OCP: añadir un nuevo tipo de bloque no requiere modificar código existente.

### LSP — Liskov Substitution Principle

No hay violaciones. Los tres contextos (Public, Authenticated, ApiKey) son sustituibles correctamente.

### ISP — Interface Segregation Principle

#### [ISP-01] TenantContext expone `resolveFilters?()` como método opcional
**Problema:** `resolveFilters` está definido como método opcional en la clase abstracta `TenantContext`, pero solo tiene sentido para PublicContext (filtra `status=PUBLISHED`) y ApiKeyContext (filtra `kind=portfolio, status=PUBLISHED`). AuthenticatedContext lo implementa como `return {}`.
**Archivos afectados:** `src/infrastructure/tenant/TenantContext.ts`, `src/infrastructure/tenant/AuthenticatedContext.ts`
**Impacto:** Bajo. Es una molestia conceptual, no un problema funcional. El método se usa correctamente en los repositorios que lo necesitan.
**Prioridad:** No hacer
**Acción concreta:** Dejar como está. El coste de refactorizar (introducir una interfaz separada) no compensa el beneficio.

### DIP — Dependency Inversion Principle

No hay violaciones con impacto real. Los repositorios dependen de Drizzle ORM, pero es la capa de infraestructura — es el lugar correcto para esa dependencia.

---

## 4. YAGNI

### Código innecesario

| Código | Motivo | Riesgo de eliminar |
|--------|--------|--------------------|
| `src/context/.gitkeep` | Directorio vacío sin propósito documentado. No hay ningún archivo que lo use. | Muy bajo |

### Abstracciones innecesarias

No se detectaron. Las abstracciones existentes (TenantContext, TenantAwareRepository, RateLimiter interface) tienen múltiples implementaciones o consumidores y justifican su existencia.

### Interfaces innecesarias

No se detectaron. La interfaz `RateLimiter` tiene dos implementaciones (Upstash + Noop) y es inyectable para testing.

### Servicios innecesarios

No se detectaron. `PromocionPublishService` y `ContentService` encapsulan lógica de negocio compleja que no pertenece en repositorios ni route handlers.

---

## 5. KISS

### Complejidad accidental

- **Boilerplate de transacciones:** Cada método de repositorio repite el patrón `return this.withTransaction(async (tx) => { ... })`. Esto es inherente al diseño de Drizzle ORM y no es simplifiable sin introducir un ORM más agresivo o un decorator pattern que añadiría indirección sin valor.

### Capas innecesarias

No se detectaron. La arquitectura tiene las capas justas: app → features → infrastructure → shared.

### Simplificaciones posibles

- **Unificar la lógica de cursor pagination.** `PromocionRepository.findAllWithCursor` y `CatalogRepository.findForApiCursor` tienen lógica de cursor casi idéntica (decode cursor, build conditions, fetch limit+1, encode next cursor). Podría extraerse un helper `buildCursorPagination({ tx, table, where, orderBy, limit, cursor })`.
- **Unificar la lógica de CSV escaping.** `arsop.repository.ts` tiene `csvField`/`csvLine` y `leads.actions.ts` tiene `escapeCsvField`. Hacen lo mismo con implementaciones ligeramente diferentes.

---

## 6. DRY

### Duplicaciones relevantes

#### [DRY-01] Lógica CSV duplicada
**Problema:** Dos implementaciones de CSV escaping:
- `src/infrastructure/db/repositories/arsop.repository.ts` (líneas 37-48): `csvField()` + `csvLine()`
- `src/features/leads/actions/leads.actions.ts` (líneas 201-210): `escapeCsvField()`

Ambas escapan comillas dobles y envuelven en comillas si el valor contiene comas, comillas o saltos de línea. Las implementaciones difieren ligeramente (arsop usa CRLF, leads usa LF).
**Archivos afectados:** 2 archivos
**Impacto:** Medio. Si se cambia la estrategia de escaping, hay que buscar en dos sitios.
**Prioridad:** Planificar
**Acción concreta:** Extraer a `src/shared/utils/csv.ts` con una sola implementación.

#### [DRY-02] KIND_LABELS duplicado en 3 componentes
**Problema:** El mapa `KIND_LABELS = { portfolio: "Portafolio", external: "Externo" }` está duplicado literalmente en:
- `src/features/promociones/components/catalog-list.tsx`
- `src/features/promociones/components/catalog-filters.tsx`
- `src/features/promociones/components/promocion-section-identity.tsx`

`src/shared/constants/domain-labels.ts` ya existe y es el lugar correcto para esta constante.
**Archivos afectados:** 3 archivos
**Impacto:** Bajo. Es un literal de 2 líneas, pero si se añade un nuevo kind, hay que cambiar 3 sitios.
**Prioridad:** Hacer inmediatamente
**Acción concreta:** Mover a `domain-labels.ts` e importar.

#### [DRY-03] Cursor pagination logic duplicada
**Problema:** La lógica de cursor pagination (decode cursor → build conditions → fetch limit+1 → hasMore check → encode next cursor) se replica con variaciones menores en:
- `PromocionRepository.findAllWithCursor` (líneas 225-285)
- `CatalogRepository.findForApiCursor` (líneas 93-153)
- `CatalogRepository.fetchPublicWithPublishedSort` (líneas 295-344)
- `CatalogRepository.fetchPublicWithPriceSort` (líneas 349-439)

**Archivos afectados:** 2 archivos, 4 métodos
**Impacto:** Medio. La lógica de cursor es sutil (el ordering compound, el hasMore check, el encode/decode) y un bug en una copia podría no replicarse en otra.
**Prioridad:** Posponer
**Acción concreta:** Extraer un helper genérico de cursor pagination. Pero la variación en los ORDER BY y JOINs hace que la abstracción sea compleja — solo hacer si hay un 5º caso.

### Duplicaciones aceptables

- **`withTransaction` boilerplate en cada método de repositorio:** Es el patrón de Drizzle ORM. Introducir una abstracción para eliminarlo añadiría indirección sin valor.
- **`buildFilterConditions` en PromocionRepository y LeadRepository:** Los filtros son diferentes (promociones filtra por status/kind/island, leads filtra por status/source/search/date). La duplicación es incidental, no perjudicial.
- **Estilos de formulario backoffice ya centralizados** en `src/shared/styles/backoffice-form.ts` — los literales restantes en componentes públicos son aceptables porque usan tokens de color diferentes.

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo | Severidad |
|---|-------|-----------|------|-----------|
| S1 | PromocionRepository — 559 líneas, 5 responsabilidades | `src/infrastructure/db/repositories/promocion.repository.ts` | God Class | Alta |
| S2 | LeadRepository — 593 líneas, 6 responsabilidades | `src/infrastructure/db/repositories/lead.repository.ts` | God Class | Alta |
| S3 | lead-detail.tsx — 507 líneas, mezcla UI + estado + lógica | `src/features/leads/components/lead-detail.tsx` | Long Component | Alta |
| S4 | promocion-form.tsx — 547 líneas, mezcla UI + estado + lógica | `src/features/promociones/components/promocion-form.tsx` | Long Component | Alta |
| S5 | CSV escaping duplicado | `arsop.repository.ts` + `leads.actions.ts` | DRY | Media |
| S6 | KIND_LABELS duplicado en 3 componentes | `catalog-list.tsx`, `catalog-filters.tsx`, `promocion-section-identity.tsx` | DRY | Media |
| S7 | MediaService.reorderGallery — N UPDATEs en loop | `src/infrastructure/media/media.service.ts:l153-164` | N queries | Media |
| S8 | getUnreadCount usa subquery SQL crudo en lugar de LEFT JOIN | `src/infrastructure/db/repositories/lead.repository.ts:l357-376` | Performance | Media |
| S9 | Dos sistemas paralelos de content blocks | `promocion-content-block.repository.ts` + `content-block.repository.ts` | Divergent Change | Media |
| S10 | CatalogRepository — 580 líneas con 4 métodos de pagination | `src/infrastructure/db/repositories/catalog.repository.ts` | Long Class | Media |
| S11 | ArsopRepository usa MediaService.uploadImage para subir CSVs | `src/infrastructure/db/repositories/arsop.repository.ts:l228` | Feature Envy / Naming | Baja |
| S12 | src/context/ directorio vacío | `src/context/.gitkeep` | Lazy Class | Baja |

### Clasificación por severidad
- **Alta:** S1, S2, S3, S4
- **Media:** S5, S6, S7, S8, S9, S10
- **Baja:** S11, S12

### Prioridad
- **Hacer de inmediato:** S6 (KIND_LABELS — 15 min)
- **Planificar:** S1, S2, S3, S4, S5, S7, S8
- **Posponer:** S9, S10, S11, S12

---

## 8. Testing

### Estado

Infraestructura de testing madura y multicapa:
- **Unit tests** con Vitest + @testing-library/react para componentes
- **Integration tests** para operaciones de base de datos (leads, users, promociones, consent, API keys, arsop, content blocks, email)
- **Isolation tests** para verificar el aislamiento multi-tenant y RLS
- **Contract tests** con snapshots para la API pública v1 (7 specs: rate-limit, docs-endpoint, consumer-mirror, snapshot-divergence, promocion-response, openapi-validation, lead-institutional)
- **E2E tests** con Playwright + Page Object Model (visitor, images, api-consumer, admin, catalog-editor, sales-agent, favorites)

### Calidad

La calidad de los tests es alta. Los tests de integración usan la base de datos real (no mocks), los contract tests capturan rupturas de schema, y los tests de aislamiento verifican la propiedad más crítica del sistema (un tenant no puede ver datos de otro).

`PromocionPublishService` tiene tests unitarios completos que cubren todos sus métodos públicos — es el único service con esta cobertura, lo cual es consistente con ser el único service formal además de `ContentService`.

### Cobertura útil

- **Bien cubierto:** repositorios (todos tienen tests), auth (config, middleware, session, rate-limit-login), email (service, repository, templates, worker), rate limiting (rate-limiter, ip-rate-limit, api-key-middleware), tenant contexts (public, authenticated, api-key, context-middleware), schemas Zod, API routes (promociones, content blocks, content history, unread count).
- **Cobertura artificial baja:** No hay tests que verifiquen el flujo completo de un draft → publish → ISR revalidation → página pública actualizada. Este flujo se prueba parcialmente en E2E pero no en integration.

### Mejoras

| Mejora | Prioridad | Coste |
|--------|-----------|-------|
| Tests de integración para el flujo draft → publish → revalidate | Media | 2-3h |
| Tests unitarios para `CatalogRepository.findPublicWithCursor` con filtros de tipología | Media | 1-2h |
| Tests de integración para `MediaService.reorderGallery` y `setCover` | Baja | 1h |

---

## 9. Seguridad

### [SEC-01] Autenticación y autorización
**Criticidad:** N/A — Bien implementado
**Archivo:** `src/infrastructure/auth/auth.config.ts`, `middleware.ts`, `require-auth.ts`, `require-admin.ts`
**Estado:** NextAuth v4 con credentials provider + JWT. Middleware protege `/panel/*` y aplica rate limiting en login. `requireAuth()` y `requireAdmin()` verifican sesión y rol en cada route handler y server action. Session duration 2h con sliding renewal.

### [SEC-02] Row-Level Security
**Criticidad:** N/A — Bien implementado
**Archivo:** `src/infrastructure/db/schema/rls.ts`, todos los schema files
**Estado:** Todas las tablas multi-tenant tienen `.enableRLS()` con la policy `tenantIsolationPolicy` que verifica `tenant_id = current_setting('app.current_tenant_id')::uuid`. El tenant ID se setea con `SET LOCAL` al inicio de cada transacción.

### [SEC-03] Rate limiting
**Criticidad:** N/A — Bien implementado
**Archivos:** `src/infrastructure/rate-limiting/`
**Estado:** Rate limiting en tres superficies: (1) login por IP con lockout, (2) API pública v1 por API key con sliding window, (3) formulario de contacto por IP. Todos degradan gracefully si Redis no está disponible.

### [SEC-04] API keys
**Criticidad:** N/A — Bien implementado
**Archivo:** `src/features/api-public/middleware/api-key-auth.ts`
**Estado:** API keys hasheadas con bcrypt (12 salt rounds). Prefix filtering (primeros 8 caracteres) para reducir bcrypt comparisons de O(n) a O(1). Fire-and-forget update de `lastUsedAt`.

### [SEC-05] Validación de entrada
**Criticidad:** N/A — Bien implementado
**Archivos:** Todos los schemas Zod en `src/shared/schemas/` y `src/shared/types/`
**Estado:** Todos los boundaries de entrada (API routes, server actions, formularios) validan con Zod. Los schemas incluyen longitudes máximas, formatos de email, UUIDs, y validaciones condicionales (ej: campos obligatorios si `status=PUBLISHED`).

### [SEC-06] Sanitización de secrets en Sentry
**Criticidad:** N/A — Bien implementado
**Archivo:** `src/infrastructure/observability/sentry.wrapper.ts`
**Estado:** `sanitizeEvent()` aplica `deepScrub()` recursivo que reemplaza valores de keys que matchean `/password|secret|token|api_?key|authorization|cookie|credit/i` por `[FILTERED]`. Se aplica en `beforeSend` y `beforeBreadcrumb`.

### [SEC-07] Variables de entorno
**Criticidad:** N/A — Bien manejado
**Archivos:** `.env.production.example`, `src/infrastructure/tenant/env.ts`, `src/infrastructure/media/env.ts`
**Estado:** No hay secrets en código fuente. Los `.env.*` están gitignorados. El `.env.production.example` tiene placeholders claros. Las variables críticas se validan en startup con proxies que lanzan errores descriptivos.

**No se detectaron issues de seguridad críticos ni altos.**

---

## 10. Performance

### [P-MED-01] MediaService.reorderGallery — N UPDATEs en loop
**Problema:** `reorderGallery` ejecuta un UPDATE individual por cada asset en el array `orderedAssetIds`. Para una galería de 20 imágenes, son 20 UPDATEs secuenciales dentro de la misma transacción.
**Archivos afectados:** `src/infrastructure/media/media.service.ts:l153-164`
**Fix recomendado:** Reemplazar el loop por un batch UPDATE con CASE expression (similar a como ya lo hace `PromocionContentBlockRepository.reorderContentBlocks` en líneas 242-267). El patrón ya existe en el proyecto.
**Impacto:** Medio. Visible con galerías grandes (>10 imágenes).

### [P-MED-02] getUnreadCount usa subquery SQL crudo
**Problema:** `getUnreadCount` usa `sql\`${leads.id} NOT IN (SELECT ${leadReadMarks.leadId} FROM ${leadReadMarks} WHERE ${leadReadMarks.userId} = ${userId})\``. Esto es funcionalmente correcto pero un LEFT JOIN con IS NULL sería más eficiente con tablas grandes, y más legible.
**Archivos afectados:** `src/infrastructure/db/repositories/lead.repository.ts:l357-376`
**Fix recomendado:** Reemplazar por LEFT JOIN + IS NULL, o usar `sql` con EXISTS.
**Impacto:** Medio. Solo visible con >10K leads por agente.

### [P-LOW-01] bcrypt.compare en loop para API keys
**Problema:** `findMatchingApiKey` itera sobre todas las active keys y hace `bcrypt.compare` para cada una. Sin prefix filter, sería O(n) con bcrypt (costoso).
**Archivos afectados:** `src/features/api-public/middleware/api-key-auth.ts:l93-112`
**Mitigación existente:** El prefix filter (primeros 8 caracteres) reduce las candidatas a O(1) en la práctica. Solo legacy keys sin prefix requieren comparación contra todas.
**Impacto:** Bajo. El prefix filter mitiga el problema.

---

## 11. Deuda Técnica

### Crítica (bloquea producción o seguridad)

No hay deuda crítica.

### Alta

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | `PromocionRepository` (559 líneas) — extraer PromocionHistoryRecorder y PromocionCursorQuery | 3-4h |
| DT-02 | `LeadRepository` (593 líneas) — extraer LeadReadMarkRepository y LeadExportService | 3-4h |
| DT-03 | `lead-detail.tsx` (507 líneas) — extraer hooks y sub-componentes | 3-4h |
| DT-04 | `promocion-form.tsx` (547 líneas) — extraer hooks y sub-componentes | 3-4h |

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-05 | Unificar CSV escaping en `src/shared/utils/csv.ts` | 1h |
| DT-06 | `MediaService.reorderGallery` — batch UPDATE en lugar de N UPDATEs | 1-2h |
| DT-07 | `getUnreadCount` — reemplazar subquery SQL crudo por LEFT JOIN | 30min |
| DT-08 | Centralizar `KIND_LABELS` en `domain-labels.ts` | 15min |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-09 | Eliminar `src/context/.gitkeep` (directorio vacío) | 5min |
| DT-10 | Renombrar `MediaService.uploadImage` para soportar uploads genéricos (no solo imágenes) | 30min |

---

## 12. Quick Wins

> Cambios < 2h, seguros de forma independiente, alto impacto.

### QW-01 — Centralizar KIND_LABELS (~15min)

Mover `{ portfolio: "Portafolio", external: "Externo" }` a `src/shared/constants/domain-labels.ts` e importar en los 3 componentes que lo duplican.

### QW-02 — Unificar CSV escaping (~1h)

Crear `src/shared/utils/csv.ts` con `escapeCsvField()` y `csvLine()`. Re-importar desde `arsop.repository.ts` y `leads.actions.ts`.

### QW-03 — MediaService.reorderGallery batch UPDATE (~1-2h)

Reemplazar el loop de UPDATEs por un CASE expression batch, usando el patrón ya existente en `PromocionContentBlockRepository.reorderContentBlocks`.

### QW-04 — getUnreadCount LEFT JOIN (~30min)

Reemplazar el subquery `NOT IN` por un LEFT JOIN + IS NULL. Verificar con tests existentes.

### QW-05 — Eliminar directorio vacío (~5min)

Eliminar `src/context/.gitkeep` y el directorio `src/context/`.

---

## 13. Refactors Estratégicos

### R-01 — Descomponer PromocionRepository

**Valor:** Reduce la complejidad del repositorio más usado del sistema. Facilita testing aislado de la lógica de history y cursor pagination.
**Separación propuesta:**
- `PromocionRepository` — CRUD básico (create, update, delete, findById)
- `PromocionHistoryRecorder` — recordHistory + HISTORY_FIELDS + requireAuth
- `PromocionCursorQuery` — findAllWithCursor + buildFilterConditions
**Coste:** 3-4h. **Riesgo de regresión:** Medio. Requiere actualizar los imports en route handlers y tests.

### R-02 — Descomponer LeadRepository

**Valor:** Reduce la complejidad del segundo repositorio más grande. Separa la lógica de read marks (4 métodos) de la lógica de CRUD de leads.
**Separación propuesta:**
- `LeadRepository` — CRUD + findAll + findById + updateStatus + reassign
- `LeadReadMarkRepository` — markAsRead, getUnreadCount, getUnreadLeadIds, isLeadReadByUser
- `LeadExportService` — exportCsv + CSV generation
**Coste:** 3-4h. **Riesgo de regresión:** Medio.

### R-03 — Extraer hooks de lead-detail.tsx

**Valor:** Reduce un componente de 507 líneas a ~150 líneas de presentación pura. Facilita testing y reutilización.
**Separación propuesta:**
- `useLeadDetail(leadId)` — fetch + estado de lead, notas, historial
- `useLeadStatusTransitions(leadId)` — lógica de transiciones de estado
- Sub-componentes: `LeadNotesTab`, `LeadHistoryTab`, `LeadDetailHeader`
**Coste:** 3-4h. **Riesgo de regresión:** Bajo.

### R-04 — Extraer hooks de promocion-form.tsx

**Valor:** Reduce un componente de 547 líneas a ~150 líneas de presentación pura.
**Separación propuesta:**
- `usePromocionForm(promocionId)` — estado del formulario + autosave
- `usePublishValidation(promocionId)` — validación de bloques + media
- Sub-componentes por sección (ya existen parcialmente como `promocion-section-*`)
**Coste:** 3-4h. **Riesgo de regresión:** Bajo.

---

## 14. Refactors NO recomendados

> OBLIGATORIO. Explica qué NO harías y por qué.

### No refactorizar: TenantContext.resolveFilters()
**Justificación:** El método opcional `resolveFilters?()` en `TenantContext` es una molestia conceptual menor (AuthenticatedContext lo implementa como `return {}`). Pero introducir una interfaz separada (`FilterableContext`) requeriría type guards en todos los repositorios que lo usan, añadiría complejidad tipográfica, y el beneficio es puramente estético. YAGNI.

### No refactorizar: withTransaction boilerplate
**Justificación:** El patrón `return this.withTransaction(async (tx) => { ... })` en cada método de repositorio es boilerplate, pero eliminarlo requeriría un decorator o proxy que añadiría indirección y dificultaría el debugging. El patrón es explícito, predecible, y funciona. No tocar.

### No unificar: los dos sistemas de content blocks
**Justificación:** `promocionContentBlocks` (bloques editoriales dentro de una promoción: descripción, calidades, zonas comunes) y `contentBlocks` (bloques de páginas públicas: home hero, FAQ, contacto) tienen dominios diferentes, ciclos de vida diferentes, y consumidores diferentes. Unificarlos en una sola tabla con un discriminator `owner_type` añadiría complejidad sin beneficio real. La duplicación de patrones es incidental.

### No abstraer: cursor pagination helper genérico
**Justificación:** Aunque la lógica de cursor se replica en 4 métodos, las variaciones en ORDER BY (updatedAt, createdAt, price), JOINs (users, tipologías, price_agg), y WHERE clauses son significativas. Un helper genérico necesitaría tantos parámetros que sería más difícil de leer que el código actual. Solo extraer si aparece un 5º caso.

### No refactorizar: CatalogRepository (580 líneas)
**Justificación:** Aunque es largo, cada método tiene una responsabilidad clara y los 4 métodos de pagination tienen variaciones reales (published sort, price sort, API cursor, public cursor). La separación en métodos privados ya es adecuada. No es un God Object — es un repositorio con varias queries.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)
- [x] [QW-01] Centralizar KIND_LABELS en domain-labels.ts — 15min
- [x] [QW-05] Eliminar src/context/ vacío — 5min
- [x] [QW-04] getUnreadCount: reemplazar subquery por LEFT JOIN — 30min
- [x] [QW-02] Unificar CSV escaping en shared/utils/csv.ts — 1h

### Fase 2 — Corto plazo (próximo mes)
- [x] [QW-03] MediaService.reorderGallery: batch UPDATE — 1-2h
- [x] [R-01] Descomponer PromocionRepository — 3-4h
- [x] [R-02] Descomponer LeadRepository — 3-4h

### Fase 3 — Medio plazo (próximo trimestre)
- [x] [R-03] Extraer hooks de lead-detail.tsx — 3-4h
- [x] [R-04] Extraer hooks de promocion-form.tsx — 3-4h
- [x] Tests de integración para flujo draft → publish → revalidate — 2-3h

### No planificado
- Unificar cursor pagination helper — posponer hasta que haya un 5º caso
- Unificar los dos sistemas de content blocks — no hacer (ver sección 14)
- Service layer para todas las features — no hacer (YAGNI, solo tiene valor donde hay lógica de negocio compleja)

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 9 | Feature-based limpia, 3 superficies bien aisladas, multi-tenant DNA respetado. Solo la falta de service layer consistente resta. |
| Simplicidad | 8 | Las abstracciones existentes justifican su existencia. Boilerplate de transacciones es inherente a Drizzle. Dos content block systems es la única complejidad accidental real. |
| Mantenibilidad | 7 | 4 archivos >500 líneas (2 repositorios + 2 componentes UI) son el techo. El resto del código es fácil de navegar y modificar. |
| Cohesión | 9 | Los features están bien delimitados. Los repositorios tienen cohesión alta internamente aunque algunos sean grandes. |
| Acoplamiento | 9 | Multi-tenant DNA garantiza bajo acoplamiento entre tenants. Los features dependen de infrastructure a través de interfaces claras. Sin dependencias circulares. |
| Legibilidad | 8 | Código bien comentado, nombres descriptivos, patrones consistentes. Los 4 archivos grandes son la excepción. |
| Calidad del diseño | 8 | TenantContext hierarchy, RateLimiter interface, EmailService con validación de templates — buen diseño donde importa. Service layer inconsistente resta. |
| Testing | 9 | Multicapa (unit, integration, isolation, contract, E2E), tests de aislamiento tenant bloqueantes, contract tests con snapshots. Solo falta coverage del flujo draft→publish→revalidate. |
| Seguridad | 9 | Auth + RLS + rate limiting + Zod validation + Sentry sanitization. No hay issues críticos ni altos. Defense in depth. |
| Deuda técnica | 7 | 4 archivos grandes + duplicación CSV + KIND_LABELS. Nada crítico, pero es el techo que limita el score global. |
| **Total** | **85/100** | **A-** |

**Calificación:** A-

**Justificación:** Domio merece un A- por su arquitectura multi-tenant rigurosa, testing maduro, security-first sin drama, y patrones bien aplicados donde importa (cursor pagination, email queue transaccional, contract tests). Los 15 puntos que separan de un A+ están concentrados en 4 archivos que han crecido más allá de lo recomendable (2 repositorios + 2 componentes UI) y duplicación menor (CSV, KIND_LABELS). No hay problemas sistémicos — es deuda local con plan de resolución claro. Subir a A requiere ejecutar los refactors R-01 a R-04. Subir a A+ requeriría además propagar el service layer a los features que tienen lógica de negocio compleja (leads, contenidos).
