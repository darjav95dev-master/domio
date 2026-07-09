# Technical Roadmap — Domio

> Generado por: engineering-auditor (adaptado desde engineering-audit.md)
> Fecha: 2026-07-09

---

## 1. Executive Summary

**Score:** 78/100 — B+

**Estado general:** Domio es una plataforma SaaS inmobiliaria con Next.js 15, TypeScript strict, Drizzle ORM y PostgreSQL. El proyecto tiene 26+ features entregadas, una infraestructura de testing excepcional (unitarios, integración, RLS isolation, contrato y E2E) y un diseño de tenant isolation a doble capa sólido. Un bug crítico en producción bloquea la subida de media para todos los usuarios.

**Fortalezas:**
- Testing de calidad excepcional: tests de aislamiento RLS, contrato y E2E completos
- Tenant isolation a dos capas (PostgreSQL RLS + TenantContext) correctamente implementado
- Transaccionalidad consistente con `withTransaction`
- TypeScript strict, ESLint sonarjs, Husky pre-commit
- Rate limiting con fail-open pattern correcto

**Riesgos principales:**
- Bug crítico: `/api/internal/media/upload` usa auth mock de desarrollo — devuelve 401 en producción
- `PromocionRepository` de 1.602 líneas acumula 6 responsabilidades distintas

---

## 2. Arquitectura

### Estado actual

```
app/                → Next.js App Router (rutas, páginas, API routes)
src/features/       → Módulos de feature (actions, components, hooks, server, schemas)
src/infrastructure/ → Servicios de infraestructura (db, auth, email, media, rate-limiting, tenant)
src/shared/         → Código compartido (components, constants, types, utils)
```

### Fortalezas
- Clara separación entre código público `(public)` y autenticado `(auth)`
- Patrón `TenantAwareRepository` bien ejecutado como base de repositorios
- Sistema de email en cola con worker desacoplado
- Rate limiting `UpstashRateLimiter / NoopRateLimiter` con polimorfismo justificado

### Debilidades
- Dos sistemas de auth en paralelo: `context-middleware.ts` (legacy, dev-only) y `session.ts` (NextAuth, producción)
- `PromocionRepository` con 6 responsabilidades mezcladas
- `MediaService` no usa `TenantContext.withTransaction` como el resto

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | Upload route usa auth mock de desarrollo | `app/api/internal/media/upload/route.ts` | Crítico |
| A2 | God Object: PromocionRepository (1.602 líneas) | `src/infrastructure/db/repositories/promocion.repository.ts` | Alto |
| A3 | MediaService bypasa TenantContext pattern | `src/infrastructure/media/media.service.ts` | Medio |
| A4 | Sistema de auth legacy sin eliminar | `src/infrastructure/tenant/context-middleware.ts` | Medio |

---

## 3. Deuda Técnica Crítica

### [DT-01] Upload route usa auth mock en producción

**Problema:** `app/api/internal/media/upload/route.ts` llama a `resolveTenantContext` que requiere la cabecera `x-mock-session` (dev-only). En producción lanza `ContextResolutionError` con 401. Ningún usuario puede subir media en producción.
**Archivos afectados:** `app/api/internal/media/upload/route.ts`
**Impacto:** Crítico
**Riesgo futuro:** Muy Alto
**Coste fix:** Muy Bajo (1-2h)
**Riesgo del refactor:** Muy Bajo
**Beneficio esperado:** Muy Alto
**Prioridad:** Hacer inmediatamente

**Acción concreta:** Reemplazar `resolveAuthContext(request)` por el patrón estándar:
```ts
const session = await getServerSession();
if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
const ctx = new AuthenticatedContext(session.tenantId, session.userId, session.role);
```
Actualizar tests de integración de upload para usar NextAuth mock en lugar de `x-mock-session`.

---

### [DT-02] God Object: PromocionRepository (1.602 líneas)

**Problema:** Un solo repositorio gestiona CRUD de promociones, content blocks, tipologías, unidades, historia de cambios y paginación pública. Cada cambio en cualquiera de estas áreas obliga a modificar el mismo fichero, aumentando el riesgo de regresiones entre responsabilidades no relacionadas.
**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts`
**Impacto:** Alto
**Riesgo futuro:** Alto
**Coste fix:** Medio (4-8h)
**Riesgo del refactor:** Medio (90+ tests)
**Beneficio esperado:** Alto
**Prioridad:** Planificar

**Acción concreta:** Extraer `PromocionContentBlockRepository` en `src/infrastructure/db/repositories/promocion-content-block.repository.ts` con los métodos: `findContentBlock`, `findAllContentBlocks`, `upsertContentBlock`, `deleteContentBlock`, `reorderContentBlocks`, `validateBlocksForPublish`. Mantener la suite de tests existente verde durante todo el proceso.

---

### [DT-03] N+1 queries en reorder y delete de content blocks

**Problema:** `reorderContentBlocks` emite una UPDATE individual por cada bloque. Con 10 bloques son 10 round-trips en la misma transacción. `deleteContentBlock` hace lo mismo al reindexar. Impacto directo en la UX del editor drag-and-drop.
**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts` (líneas 1254-1322)
**Impacto:** Alto
**Riesgo futuro:** Medio
**Coste fix:** Bajo (2-4h)
**Riesgo del refactor:** Bajo
**Beneficio esperado:** Alto
**Prioridad:** Planificar

**Acción concreta:** Reemplazar el loop de UPDATEs por una sola query con CASE:
```sql
UPDATE promocion_content_blocks
SET sort_order = CASE id WHEN $1 THEN 0 WHEN $2 THEN 1 ... END
WHERE id IN ($1, $2, ...) AND tenant_id = $tenantId
```
Alternativamente: cambiar `sort_order` a `float` y solo actualizar el bloque movido (fractional indexing).

---

### [DT-04] Scan bcrypt O(n) en API key validation

**Problema:** `findMatchingApiKey` carga todas las API keys activas y ejecuta `bcrypt.compare` en cada una (~100ms × N por request). Con 20 keys son ~2s de CPU por request. Abre vector de DoS asistido.
**Archivos afectados:** `src/features/api-public/middleware/api-key-auth.ts`
**Impacto:** Medio
**Riesgo futuro:** Alto (crece con el número de keys)
**Coste fix:** Medio (3-5h incluyendo migración de schema)
**Riesgo del refactor:** Bajo
**Beneficio esperado:** Alto
**Prioridad:** Planificar

**Acción concreta:** Añadir columna `key_prefix VARCHAR(8)` en tabla `api_keys`. Filtrar por prefijo antes de bcrypt. Solo comparar el 1-2 candidatos que coincidan:
```ts
const candidates = await db.select().from(apiKeys)
  .where(and(eq(apiKeys.keyPrefix, plaintextKey.slice(0, 8)), eq(apiKeys.isActive, true)));
```

---

## 4. Code Smells y Mantenibilidad

### [CS-01] Código muerto: sistema de auth legacy

**Problema:** `context-middleware.ts` contiene `resolveTenantContext`, `assertDevelopmentOnly`, `MOCK_AUTH_USER_ID`, `MOCK_AUTH_ROLE`, `MOCK_API_KEY_ID` y `tenantContextStorage` que son exclusivamente dev-only y nunca deben ejecutarse en producción. Solo los usa el upload route (que es un bug).
**Archivos afectados:** `src/infrastructure/tenant/context-middleware.ts`
**Impacto:** Medio
**Coste fix:** Bajo (2-3h — ajustar sentry antes de eliminar `tenantContextStorage`)
**Prioridad:** Planificar (después de DT-01)

**Acción concreta:** Tras arreglar DT-01, actualizar `sentry-integration.ts` para que lea el contexto de otra forma. Luego eliminar de `context-middleware.ts`: `resolveTenantContext`, `assertDevelopmentOnly`, las tres constantes mock y `tenantContextStorage`.

---

### [CS-02] Duplicación del SELECT de columnas en PromocionRepository

**Problema:** El mismo objeto de selección de 20+ campos se repite en 5 métodos (`findAll`, `findById`, `findDetailBySlug`, `fetchPublicWithPublishedSort`, `fetchPublicWithPriceSort`). Cuando cambia el schema hay que actualizarlo en 5 sitios.
**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts`
**Impacto:** Bajo
**Coste fix:** Muy Bajo (1h)
**Prioridad:** Planificar

**Acción concreta:** Extraer constante `PROMOCION_SELECT_COLUMNS` en la parte superior del fichero y referenciarla en los 5 métodos.

---

### [CS-03] Patrón getServerSession + AuthenticatedContext duplicado en route handlers

**Problema:** Múltiples route handlers repiten el mismo bloque de 3 líneas para autenticar y construir el contexto. No existe `requireAuth()` genérico (solo `requireAdmin()`).
**Archivos afectados:** `app/api/internal/promociones/route.ts`, `app/api/internal/promociones/[id]/route.ts` y otros handlers internos
**Impacto:** Bajo
**Coste fix:** Muy Bajo (1h)
**Prioridad:** Hacer inmediatamente (junto con DT-01)

**Acción concreta:** Crear `src/infrastructure/auth/require-auth.ts`:
```ts
export async function requireAuth() {
  const session = await getServerSession();
  if (!session) return { authorized: false as const, status: 401 };
  return {
    authorized: true as const,
    ctx: new AuthenticatedContext(session.tenantId, session.userId, session.role),
    session,
  };
}
```

---

## 5. Seguridad

### [SEC-01] URL del backoffice hardcodeada en código de negocio

**Severidad:** Baja
**Archivos afectados:** `src/features/engagement/server/create-lead-action.ts:38`

**Problema:** `"https://panel.domio.com/leads"` hardcodeada cuando ya existe `AUTH_HOST` en `src/shared/constants/tenant-hosts.ts`.

**Acción concreta:**
```ts
// En tenant-hosts.ts:
export const BACKOFFICE_LEADS_URL = `https://${AUTH_HOST}/leads`;

// En create-lead-action.ts: importar BACKOFFICE_LEADS_URL, eliminar la constante local
```

---

### [SEC-02] MediaService no usa TenantContext.withTransaction

**Severidad:** Media
**Archivos afectados:** `src/infrastructure/media/media.service.ts`

**Problema:** Gestiona transacciones manualmente en lugar de usar el patrón establecido. Inconsistencia arquitectónica que podría saltar controles de tenant isolation si se extiende el servicio.

**Acción concreta:** Refactorizar `MediaService` para recibir `TenantContext` en el constructor y usar `ctx.withTransaction()` igual que los repositories.

---

## 6. Testing

**Estado actual:** Excepcional para la madurez del proyecto. 90+ ficheros de test con threshold 80%, tests de aislamiento RLS, contrato y E2E con Playwright.

| ID | Hallazgo | Prioridad |
|----|----------|-----------|
| T-01 | Test de upload usa `x-mock-session` en lugar de NextAuth real — no refleja comportamiento en producción | Alta |
| T-02 | Tests de integración con estado compartido de BD (`fileParallelism: false`) — frágil ante ejecución paralela | Media |
| T-03 | Falta test E2E: crear inmueble → publicar → verificar SEO metadata | Baja |

---

## 7. Performance

### [PERF-01] N+1 queries en reorderContentBlocks y deleteContentBlock

Ver DT-03. Impacto directo en UX del editor. Con arrays de >20 bloques la degradación es perceptible.

### [PERF-02] Scan bcrypt O(n) en API keys

Ver DT-04. ~100ms × N por request autenticado a `/api/v1/`.

### [PERF-03] Count query duplicada en findPublicWithCursor

**Problema:** Se emite siempre un COUNT total aunque ya haya cursor. Con cursor pagination el count no es necesario para navegar.
**Acción concreta:** Omitir el COUNT en requests con cursor, o cachear el resultado por filtro activo.

---

## 8. Quick Wins

| # | Acción | Archivos | Tiempo estimado |
|---|--------|----------|-----------------|
| QW-01 | Arreglar upload route → `getServerSession()` | `app/api/internal/media/upload/route.ts` | 1-2h |
| QW-02 | Añadir `requireAuth()` helper | `src/infrastructure/auth/require-auth.ts` (nuevo) | 1h |
| QW-03 | Mover URL hardcodeada a `tenant-hosts.ts` | `src/features/engagement/server/create-lead-action.ts`, `src/shared/constants/tenant-hosts.ts` | 15min |
| QW-04 | Eliminar `api-key-verifier.ts` | `src/infrastructure/api-keys/api-key-verifier.ts` | 5min |
| QW-05 | Eliminar `EMAIL_STATUS` objeto duplicado (mantener solo array) | `src/infrastructure/email/db-enums.ts` | 30min |

---

## 9. Refactors Estratégicos

| # | Refactor | Impacto | Coste | Cuando |
|---|----------|---------|-------|--------|
| R-01 | Extraer `PromocionContentBlockRepository` | Alto | Medio | Sprint siguiente |
| R-02 | Migrar `MediaService` a `TenantContext` | Medio | Bajo | Sprint siguiente |
| R-03 | Batch UPDATE en reorder/delete de blocks | Alto | Bajo | Sprint siguiente |
| R-04 | Añadir `key_prefix` para API key validation O(1) | Medio | Medio | Backlog |
| R-05 | Extraer `PROMOCION_SELECT_COLUMNS` constante | Bajo | Muy Bajo | Sprint siguiente |

---

## 10. Refactors NO recomendados

| Cambio | Razón |
|--------|-------|
| Simplificar tenant isolation (TenantContext / RLS) | Está correctamente justificado — simplificarlo rompería la segunda línea de defensa que los tests de aislamiento verifican |
| Migrar a Auth.js v5 ahora | `next-auth@4` estable en producción — migración de alto riesgo con bajo valor a corto plazo. Planificar cuando llegue a fin de soporte |
| Extraer EmailService a bounded context propio | Ya bien encapsulado en `src/infrastructure/email/` — añadiría capas sin valor |
| Añadir Value Objects / DDD entities sobre Drizzle | Capa de traducción costosa sin beneficio tangible para este stack y tamaño de proyecto |
| Migrar tests de integración a mocks en lugar de BD real | Los tests contra BD real son los más valiosos — verifican RLS y transacciones que los mocks nunca podrían simular |
| Normalizar nombres de ficheros PascalCase → kebab-case | Solo cosmético — requeriría actualizar importaciones en todo el proyecto |
| Refactorizar PublicContext/AuthenticatedContext/ApiKeyContext a factory | Están bien como clases simples — el factory no añadiría testabilidad ni simplicidad |

---

## 11. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)

- [ ] [DT-01] Arreglar upload route — reemplazar `resolveAuthContext` por `getServerSession()` y actualizar tests
- [ ] [CS-03] Crear `requireAuth()` helper y aplicarlo en route handlers internos
- [ ] [SEC-01] Mover URL hardcodeada `panel.domio.com/leads` a `tenant-hosts.ts`
- [ ] [QW-04] Eliminar `src/infrastructure/api-keys/api-key-verifier.ts`
- [ ] [QW-05] Eliminar objeto `EMAIL_STATUS` redundante en `db-enums.ts`

### Fase 2 — Corto plazo (próximo mes)

- [ ] [CS-01] Eliminar código legacy de `context-middleware.ts` (mock auth, `resolveTenantContext`, `tenantContextStorage`) — requiere ajustar sentry-integration primero
- [ ] [DT-02] Extraer `PromocionContentBlockRepository` de `PromocionRepository`
- [ ] [SEC-02] Migrar `MediaService` a `TenantContext.withTransaction`
- [ ] [DT-03] Implementar batch UPDATE en `reorderContentBlocks` y `deleteContentBlock`
- [ ] [CS-02] Extraer constante `PROMOCION_SELECT_COLUMNS`

### Fase 3 — Medio plazo (próximo trimestre)

- [ ] [DT-04] Añadir `key_prefix` en `api_keys` para validation O(1) — incluye migración de schema y backfill
- [ ] [T-01] Añadir test de integración de upload con NextAuth real
- [ ] [PERF-03] Omitir COUNT en requests con cursor en `findPublicWithCursor`
- [ ] Extraer `PromocionHistoryRepository` de `PromocionRepository`
- [ ] Planificar migración a Auth.js v5

### No planificado

- Naming inconsistency PascalCase/kebab-case — solo cosmético, riesgo > beneficio
- Factory pattern para TenantContext variants — YAGNI

---

## 12. Score Detallado

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 7.8 | Clara y coherente, penalizada por God Object y auth legacy |
| Simplicidad | 7.2 | Penalizada por N+1 y scan bcrypt lineal |
| Mantenibilidad | 8.0 | Buena organización por features, penalizada por PromocionRepository monolítico |
| Cohesión | 7.5 | Módulos de feature cohesivos; PromocionRepository rompe la tendencia |
| Acoplamiento | 8.2 | Dependencias bien dirigidas sin ciclos |
| Legibilidad | 8.5 | Código bien nombrado, TypeScript strict |
| Calidad del diseño | 8.0 | Tenant isolation y email async excelentes |
| Testing | 9.0 | Tests RLS isolation y E2E poco comunes a esta escala |
| Seguridad | 7.0 | Bug crítico en upload pesa; resto sólido |
| Deuda técnica | 7.2 | Manejable salvo el bug crítico de producción |
| **Total** | **78/100** | |

**Calificación:** B+

**Justificación:** Considerablemente por encima del promedio para su etapa. La infraestructura de testing (especialmente RLS isolation y contrato) es ejemplar. Lo que impide el A es el bug crítico de producción en el upload route y el God Object de PromocionRepository. Con las Fases 1 y 2 completadas, el proyecto alcanzaría fácilmente A- (88/100).
