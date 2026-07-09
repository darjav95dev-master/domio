# Engineering Audit — Domio

> Auditoría realizada el 2026-07-09 sobre el estado actual del proyecto (rama `main`, commit HEAD).
> Alcance: todo el código fuente bajo `src/`, `app/`, `tests/` y archivos de configuración raíz.

---

## 1. Executive Summary

### Estado general del proyecto

Domio es una plataforma SaaS para gestión inmobiliaria construida con Next.js 15, React 19, TypeScript estricto, Drizzle ORM, PostgreSQL y Tailwind CSS v4. El proyecto lleva al menos 26 features entregadas de forma incremental (branches `feature/001` a `feature/026`), con una cobertura de tests excelente: tests unitarios, de integración, de aislamiento RLS, de contrato y E2E con Playwright.

La arquitectura general es coherente y bien pensada. El sistema de tenant isolation a doble capa (PostgreSQL RLS + contexto de aplicación) es sólido. La gestión de sesiones con NextAuth v4 está bien integrada. El rate limiting con Redis fail-open es correcto. El sistema de email asíncrono con worker es profesional.

### Principales riesgos

- **Bug crítico en producción**: el endpoint de subida de media (`/api/internal/media/upload`) usa un sistema de auth mock (dev-only) en lugar de NextAuth como el resto de rutas. Este endpoint falla con 401 en producción.
- **God Object**: `PromocionRepository` tiene 1.602 líneas y gestiona demasiadas responsabilidades (CRUD de promociones, content blocks, tipologías, unidades, historia, validación de publicación).
- **N+1 queries**: `reorderContentBlocks` y `deleteContentBlock` emiten una UPDATE individual por bloque dentro de una transacción.
- **Scan lineal de API keys con bcrypt**: cada petición a `/api/v1/` ejecuta bcrypt.compare contra todas las API keys activas de la BD.

### Fortalezas destacadas

- Testing de excepcional calidad: 90+ ficheros de test con cobertura de threshold 80%, tests de aislamiento RLS, tests de contrato y E2E completos.
- Tenant isolation a dos capas correctamente implementado.
- Buenas prácticas de transaccionalidad (todas las escrituras críticas en `withTransaction`).
- TypeScript strict mode, ESLint con sonarjs, Husky pre-commit.
- Arquitectura de features bien organizada y consistente.

---

## 2. Arquitectura

### Estado actual

El proyecto sigue una arquitectura de capas implícita:

```
app/                    → Next.js App Router (rutas, páginas, API routes)
src/features/           → Módulos de feature (actions, components, hooks, server, schemas)
src/infrastructure/     → Servicios de infraestructura (db, auth, email, media, rate-limiting, tenant)
src/shared/             → Código compartido (components, constants, types, utils)
```

La separación es razonablemente buena. Los features importan de `infrastructure` y `shared`, lo cual es correcto. Las rutas API en `app/api/` actúan como controladores delgados que delegan en repositorios o servicios.

El sistema de contexto de tenant (`TenantContext → AuthenticatedContext / PublicContext / ApiKeyContext`) es un diseño elegante que centraliza la identidad del tenant y lo propaga a las transacciones de base de datos mediante `set_config('app.current_tenant_id')`.

### Fortalezas

- Clara separación entre código público (`(public)`) y autenticado (`(auth)`).
- Patrón Repository con `TenantAwareRepository` como base bien ejecutado.
- RLS en PostgreSQL como segunda línea de defensa independiente de la aplicación.
- Sistema de email en cola con worker desacoplado de las acciones.
- Rate limiting con patrón fail-open (NoopRateLimiter si Redis no está disponible).
- Revalidación de cache ISR correctamente gestionada en las rutas de mutación.

### Debilidades

1. **Dos sistemas de auth en paralelo**: existe un sistema de auth antiguo basado en `resolveTenantContext` + AsyncLocalStorage (`context-middleware.ts`) y el sistema real basado en NextAuth (`session.ts`). El antiguo nunca fue eliminado y solo funciona en desarrollo.
2. **`PromocionRepository` acumula demasiadas responsabilidades** que deben pertenecer a repositorios propios.
3. **`MediaService` no usa `TenantContext`**: gestiona sus transacciones manualmente en lugar de usar el patrón establecido.

### Hallazgos

| # | Hallazgo | Ubicación | Impacto |
|---|---|---|---|
| A1 | Bug crítico: upload route usa auth mock | `app/api/internal/media/upload/route.ts` | Critical |
| A2 | God Object: PromocionRepository (1.602 líneas) | `src/infrastructure/db/repositories/promocion.repository.ts` | High |
| A3 | MediaService bypasa TenantContext pattern | `src/infrastructure/media/media.service.ts` | Medium |
| A4 | Sistema de auth legacy no eliminado | `src/infrastructure/tenant/context-middleware.ts` | Medium |

---

## 3. SOLID

### Violaciones encontradas

#### SRP — Single Responsibility Principle

**`PromocionRepository`** es el violador más claro. Un solo repositorio gestiona:
- CRUD básico de promociones (`create`, `findAll`, `findById`, `update`, `delete`, `updateDraft`)
- Content blocks (`findContentBlock`, `findAllContentBlocks`, `upsertContentBlock`, `deleteContentBlock`, `reorderContentBlocks`, `validateBlocksForPublish`)
- Historia de cambios (`getHistory`, `recordFieldChanges`)
- Sincronización de tipologías y unidades (`syncTipologiasInTx`, `assembleTipologias`, `updateOneTipologiaInTx`, `createOneTipologiaInTx`, `syncUnidadesInTx`, `buildTipologiaUpdate`, `buildTipologiaCreate`)
- Paginación de catálogo público con cursors (`findPublicWithCursor`, `fetchPublicWithPublishedSort`, `fetchPublicWithPriceSort`)
- Paginación para API pública (`findForApiCursor`)

Esto produce un fichero de 1.602 líneas difícil de testear aisladamente, de mantener y de entender.

**Impacto**: cada vez que cambia cualquiera de estas responsabilidades, hay riesgo de regresiones en las demás. La mezcla también dificulta aplicar caching o estrategias diferentes a las queries de catálogo público vs las de backoffice.

#### SRP — `app/api/internal/media/upload/route.ts`

Contiene lógica de validación de formulario multipart, lógica de auth, lógica de negocio del upload. Demasiado para un route handler.

### Impacto

Alto en `PromocionRepository`. Cualquier nueva feature que toque promociones o content blocks obliga a modificar el mismo fichero, aumentando el riesgo de conflictos y regresiones.

### Prioridad

**Planificar** la extracción de `ContentBlockRepository` propio (que ya existe en `src/features/contenidos/server/content-block.repository.ts` pero no para promociones). El split debe hacerse con calma porque `PromocionRepository` está muy testeado.

---

## 4. YAGNI

### Código innecesario

**`src/infrastructure/api-keys/api-key-verifier.ts`** — 18 líneas que solo llaman a `bcrypt.compare(plainKey, keyHash)`. Este fichero existe pero el auth de API keys real se implementa en `src/features/api-public/middleware/api-key-auth.ts` con `findMatchingApiKey`, que hace la comparación directamente. `api-key-verifier.ts` nunca es importado desde código de producción.

**`NoopRateLimiter.alwaysAllow()` como método privado** — los tres métodos públicos llaman a `alwaysAllow()`, que es trivial. No aporta abstracción, solo añade una indirección innecesaria de una línea.

### Abstracciones innecesarias

**`context-middleware.ts` — la mitad del fichero es código dev-only** que nunca debe ejecutarse en producción. `resolveTenantContext` fue diseñado para un modelo de contexto global que finalmente no se adoptó (el proyecto usa creación de contexto por request en cada handler). `tenantContextStorage` solo es usado en `upload/route.ts` (que es un bug) y en `sentry-integration.ts` (que puede y debe leer el contexto de otra forma).

### Interfaces innecesarias

No hay interfaces innecesarias detectadas. Las interfaces existentes (`RateLimiter`, `RateLimitConfig`, `RateLimitResult`) justifican el polimorfismo `UpstashRateLimiter / NoopRateLimiter`.

### Servicios innecesarios

No hay servicios que solo deleguen una sola llamada.

### Código eliminable

| Código | Motivo | Riesgo de eliminar |
|---|---|---|
| `src/infrastructure/api-keys/api-key-verifier.ts` | Nunca usado en producción | Muy bajo |
| `resolveTenantContext` en `context-middleware.ts` | Solo lo usa el upload route (bug) | Bajo (arreglar el bug primero) |
| `assertDevelopmentOnly` en `context-middleware.ts` | Solo lo llama `resolveTenantContext` | Bajo |
| `MOCK_AUTH_USER_ID`, `MOCK_AUTH_ROLE`, `MOCK_API_KEY_ID` en `context-middleware.ts` | Constantes del mock dev | Bajo |
| `tenantContextStorage` (AsyncLocalStorage) en `context-middleware.ts` | Solo usado en el upload route (bug) y sentry | Bajo (ajustar sentry antes) |
| `NoopRateLimiter.alwaysAllow()` | Inline trivial | Muy bajo |

---

## 5. KISS

### Complejidad accidental

#### Fetchs N+1 en reordenamiento y borrado de content blocks

`deleteContentBlock` (líneas 1254-1298) borra un bloque y luego reitera sobre los restantes emitiendo una UPDATE individual por cada bloque para reindexar el `sort_order`. Si hay 10 bloques, son 10 queries separadas en la misma transacción. Lo mismo ocurre en `reorderContentBlocks` (líneas 1304-1322).

La solución es una sola UPDATE con una expresión CASE o una serie de VALUES en un UPDATE más, pero es más simple que el loop actual. Alternativamente, el sort_order podría ser un `float` (técnica "Jira-like") para evitar reindexar en absoluto.

#### Scan lineal de API keys con bcrypt

`findMatchingApiKey` en `api-key-auth.ts` carga todos los registros activos de `api_keys` y ejecuta `bcrypt.compare` en cada uno. Con bcrypt el coste es intencional (~100ms por hash). Con 10 keys son ~1 segundo de CPU bloqueante por request. La solución estándar es almacenar un prefijo de la key en texto plano y filtrar por él antes de hacer bcrypt.

#### Duplicación del SELECT de columnas en PromocionRepository

Los métodos `findAll`, `findById`, `findDetailBySlug`, `fetchPublicWithPublishedSort`, y `fetchPublicWithPriceSort` repiten casi exactamente el mismo objeto de selección de 20+ campos. Esto es ~100 líneas de código que solo diferirán cuando el schema cambie, con riesgo de olvidar actualizar alguno.

### Capas innecesarias

No hay capas de abstracción añadidas sin valor. La arquitectura en general es correcta.

### Simplificaciones posibles

1. Extraer una constante `PROMOCION_SELECT_COLUMNS` en `PromocionRepository` para el select de columnas repetido.
2. Usar `float` sort_order (o CASE en UPDATE) en lugar del loop de reindexación.
3. Añadir campo `key_prefix` en `api_keys` para reducir candidates en la búsqueda.

---

## 6. DRY

### Duplicaciones relevantes

#### Dos `createLeadAction` en módulos diferentes

- `src/features/engagement/server/create-lead-action.ts`: crea un lead desde el formulario público de contacto de un inmueble. Incluye rate limiting por IP, validación de promocionId, consent record, y encola emails.
- `src/features/leads/actions/leads.actions.ts` línea 211: también exporta una `createLeadAction` (desde FormData) para el módulo de leads del backoffice.

Son dos funciones con distinta lógica interna pero el mismo nombre exportado. Esto puede causar confusión sobre cuál usar y dificulta el grep de usages.

#### SELECT de columnas de promoción repetido

El objeto de selección de columnas de `promociones` + join de `users.name` se repite en 5 métodos distintos dentro del mismo repositorio. Ver sección KISS.

#### Patrón `getServerSession → AuthenticatedContext` repetido

En múltiples route handlers (`/api/internal/promociones/[id]/route.ts`, `/api/internal/promociones/route.ts`, etc.) se repite el mismo patrón:

```ts
const session = await getServerSession();
if (!session) return Response.json({ error: "Unauthenticated" }, { status: 401 });
const authCtx = new AuthenticatedContext(session.tenantId, session.userId, session.role);
```

Existe `requireAdmin()` para el caso ADMIN, pero no existe un `requireAuth()` genérico que devuelva el `AuthenticatedContext` sin requerir rol específico. Esto genera duplicación en todos los handlers que permiten cualquier rol autenticado.

### Duplicaciones aceptables

- Los distintos formatos de respuesta de error en route handlers. Cada ruta gestiona sus errores de forma similar pero no idéntica — es incidental.
- El patrón de guard en acciones (`createContextAndRepo`) en `leads.actions.ts` es específico de ese módulo.

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo |
|---|---|---|---|
| S1 | God Object | `PromocionRepository` (1.602 líneas) | God Class |
| S2 | Magic String hardcodeada | `create-lead-action.ts:38` — `"https://panel.domio.com/leads"` | Magic String |
| S3 | Código muerto (dev-only never reached en prod) | `context-middleware.ts` — `resolveTenantContext`, mock constants | Dead Code |
| S4 | Lazy Class | `api-key-verifier.ts` — solo wrappea `bcrypt.compare` | Lazy Class |
| S5 | Shotgun Surgery | Cambiar el schema de `promociones` requiere actualizar 5+ select objects | Shotgun Surgery |
| S6 | Feature Envy | `PromocionRepository` gestiona content blocks y tipologías que deberían estar en sus propios repositorios | Feature Envy |
| S7 | Duplicated export name | `createLeadAction` exportado desde dos módulos distintos | Naming Collision |
| S8 | N+1 queries | `reorderContentBlocks` y `deleteContentBlock` | N+1 |
| S9 | Long Method | `update()` en `PromocionRepository` (~100 líneas) | Long Method |
| S10 | Type casting sin validación | `rows[limit-1] as Record<string, unknown>` en `fetchPublicWithPriceSort` | Type Unsafe Cast |
| S11 | Constant vs enum redundancy | `EMAIL_STATUS` objeto y `EMAIL_STATUSES` array coexisten en `db-enums.ts` | Redundancy |
| S12 | PascalCase filename inconsistency | `TenantAwareRepository.ts`, `AuthenticatedContext.ts`, `TenantContext.ts` vs todos los demás en kebab-case | Naming Inconsistency |

### Clasificación por severidad

- **Alta**: S1, S2, S3, S8
- **Media**: S4, S5, S6, S7, S9, S10
- **Baja**: S11, S12

### Prioridad

- **Hacer de inmediato**: S2 (mover URL a `tenant-hosts.ts`), S3 (eliminar código muerto tras arreglar upload route)
- **Planificar**: S1 (split PromocionRepository), S5 (extraer PROMOCION_SELECT_COLUMNS), S8 (optimizar reorder/delete)
- **Posponer**: S4, S7, S9, S10, S11, S12

---

## 8. Testing

### Estado

El proyecto tiene una infraestructura de tests excepcional para su madurez:
- Tests unitarios: ~85 ficheros bajo `src/**/*.spec.ts` y `tests/unit/`
- Tests de integración: ~15 ficheros bajo `tests/integration/` con DB real
- Tests de aislamiento RLS: `tests/isolation/` verifican que un tenant no puede ver datos de otro
- Tests de contrato: `tests/contract/` verifican el schema de la API pública v1
- Tests E2E: Playwright con Page Objects, fixtures de auth y reset de DB

Los tests de aislamiento RLS son especialmente valiosos y poco comunes en proyectos de esta escala.

### Calidad

La mayoría de los tests unitarios están bien escritos: usan `vi.mock` con moderación, no prueban implementaciones sino comportamientos, y los casos edge están cubiertos (vacío, inválido, edge de paginación).

Dos patrones problemáticos detectados:

1. Algunos tests de integración dependen de estado compartido de BD (ejecución secuencial forzada con `fileParallelism: false`). Esto es aceptable pero frágil.
2. El test `tests/integration/media/upload.test.ts` testea el route handler que usa `resolveTenantContext` (el bug). Los tests pasarán en desarrollo (`NODE_ENV=test`) pero no reflejan el comportamiento en producción.

### Cobertura útil

La cobertura es funcional: las rutas críticas (leads, publicación, auth, rate limiting, consent records, RLS) están testeadas. Los componentes de UI tienen cobertura de renders y comportamientos accesibles.

### Mejoras

| Mejora | Prioridad | Coste |
|---|---|---|
| Añadir test de que `upload/route` funciona con NextAuth real (no con mock) | Alta | Bajo |
| Test de que `createLeadAction` con MISSING `assignedAgentId` retorna error correcto | Media | Bajo |
| Test E2E de flujo completo: crear inmueble → publicar → verificar SEO metadata | Baja | Medio |

---

## 9. Seguridad

### Hallazgos

#### S-CRIT-01: Media Upload roto en producción (AuthN bypasada)

**Criticidad**: Critical  
**Fichero**: `app/api/internal/media/upload/route.ts`

El handler llama a `resolveTenantContext` que, para el host `panel.domio.com`, requiere la cabecera `x-mock-session` (dev-only) y ejecuta `assertDevelopmentOnly`. En producción, sin esa cabecera, lanza `ContextResolutionError` con status 401. El resultado es que en producción **ningún usuario puede subir media**, independientemente de su sesión válida.

Este no es un bug de seguridad en el sentido de acceso no autorizado (la ruta devuelve 401, no 200), pero es un fallo de funcionalidad crítico que impide la operación de la plataforma.

**Fix**: reemplazar `resolveAuthContext` en el upload route por el patrón estándar:
```ts
const session = await getServerSession();
if (!session) return NextResponse.json({ error: "Auth required" }, { status: 401 });
const ctx = new AuthenticatedContext(session.tenantId, session.userId, session.role);
```

#### S-MED-01: Scan bcrypt O(n) por request en API pública

**Criticidad**: Medium  
**Fichero**: `src/features/api-public/middleware/api-key-auth.ts`

`findMatchingApiKey` carga todas las API keys activas y ejecuta bcrypt.compare en cada una. Con 20 keys y bcrypt cost=10, cada request tarda ~2 segundos solo en validar la key. Esto abre una ventana de DoS asistido: incluso con rate limiting, un atacante con una key válida puede saturar el thread pool.

**Fix**: añadir columna `key_prefix VARCHAR(8)` (primeros 8 chars en texto plano), filtrar por prefijo antes de bcrypt, y solo comparar los 1-2 candidatos que coincidan.

#### S-LOW-01: URL del backoffice hardcodeada en código de negocio

**Criticidad**: Low  
**Fichero**: `src/features/engagement/server/create-lead-action.ts:38`

```ts
const AGENT_NOTIFICATION_BACKOFFICE_URL = "https://panel.domio.com/leads";
```

Ya existe `AUTH_HOST` en `src/shared/constants/tenant-hosts.ts`. El URL debería construirse desde esa constante para evitar divergencia.

#### S-LOW-02: Middleware de auth solo verifica existencia de cookie, no validez

El `middleware.ts` verifica si existe la cookie `next-auth.session-token` pero no la valida. Esto es el patrón estándar de NextAuth v4 (la validación real ocurre en el Server Component de layout). No es un problema en sí, pero merece documentarse explícitamente como decisión de diseño.

#### S-INFO-01: `trustHost: true` en NextAuth config

`authConfig` tiene `trustHost: true`. Esto es necesario en entornos de reverse proxy pero significa que se confía en la cabecera `Host` para construir URLs de callback. Asegurarse de que el reverse proxy (Vercel o similar) no permita cabeceras `Host` forjadas.

#### S-INFO-02: Consent records protegidos por RLS

El diseño de consent records con RLS `INSERT ONLY` (inmutables post-creación) es correcto y bien implementado. Nada que cambiar.

---

## 10. Performance

### Problemas reales

#### P-HIGH-01: N+1 queries en reorderContentBlocks y deleteContentBlock

`reorderContentBlocks` emite una `UPDATE` por cada elemento del array ordenado (N queries). Con 10 bloques son 10 round-trips al servidor en la misma transacción. Para arrays pequeños (<20 bloques) el impacto es tolerable, pero degrada con el número de bloques.

**Fix recomendado**: single `UPDATE ... SET sort_order = CASE id WHEN ... THEN ... END WHERE id IN (...)`. Alternativamente, cambiar `sort_order` a `float` y solo actualizar el bloque movido (técnica de ordenación fractional).

`deleteContentBlock` hace lo mismo tras el borrado para reindexar.

#### P-MED-01: Scan bcrypt de API keys

Ya documentado en Seguridad (S-MED-01). El impacto de performance es real: ~100ms * N por request autenticado a la API pública.

#### P-LOW-01: Count query duplicada en findPublicWithCursor

En `findPublicWithCursor`, se emite siempre una query de count total, incluso cuando ya tenemos cursor (las páginas posteriores). Con cursor pagination el count no es necesario para navegación, solo para mostrar "X resultados". Considerar si el count es realmente necesario en cada página o si se puede cachear/omitir en requests con cursor.

---

## 11. Deuda Técnica

### Clasificada por prioridad

#### Crítica (bloquea producción)

| Deuda | Descripción | Effort |
|---|---|---|
| DT-01 | Upload route usa mock auth en producción | `app/api/internal/media/upload/route.ts` → migrar a NextAuth | 1-2h |

#### Alta

| Deuda | Descripción | Effort |
|---|---|---|
| DT-02 | PromocionRepository God Object | Extraer ContentBlocksRepository para promociones | 4-8h |
| DT-03 | N+1 en reorder/delete de content blocks | Reemplazar loops por batch UPDATE | 2-4h |
| DT-04 | Scan bcrypt O(n) en API key validation | Añadir key_prefix + migración de schema | 3-5h |

#### Media

| Deuda | Descripción | Effort |
|---|---|---|
| DT-05 | Eliminar context-middleware legacy (mock auth) | Mover sentry integration, eliminar fichero | 2-3h |
| DT-06 | MediaService no usa TenantContext.withTransaction | Refactorizar para usar el patrón estándar | 2-3h |
| DT-07 | Duplicación de SELECT columns en PromocionRepository | Extraer constante PROMOCION_SELECT_COLUMNS | 1h |
| DT-08 | URL hardcodeada en create-lead-action | Mover a tenant-hosts.ts | 15min |
| DT-09 | api-key-verifier.ts nunca usado | Eliminar fichero | 5min |

#### Baja

| Deuda | Descripción | Effort |
|---|---|---|
| DT-10 | EMAIL_STATUS objeto duplicado de EMAIL_STATUSES | Eliminar objeto, usar solo el array | 30min |
| DT-11 | Naming inconsistency de ficheros PascalCase | Renombrar o dejar — solo cosmético | 1h |
| DT-12 | next-auth@4 en lugar de Auth.js v5 | Actualización mayor, planificar para una sprint | 8-12h |

---

## 12. Quick Wins

Cambios de bajo coste y alto impacto (todas < 2h, cada uno seguro de forma independiente):

### QW-01 — Arreglar upload route (CRÍTICO, ~1-2h)

Reemplazar `resolveAuthContext` en `app/api/internal/media/upload/route.ts`:

```ts
// ANTES (dev-only, broken en prod):
const ctx = resolveAuthContext(request); 

// DESPUÉS (producción-ready):
const session = await getServerSession();
if (!session) {
  return NextResponse.json({ error: "Authentication required" }, { status: 401 });
}
const ctx = new AuthenticatedContext(session.tenantId, session.userId, session.role);
```

Actualizar los tests de integración de upload para usar NextAuth mock en lugar de x-mock-session.

### QW-02 — Eliminar api-key-verifier.ts (~5min)

```bash
rm src/infrastructure/api-keys/api-key-verifier.ts
```

No tiene importers en producción. Verificar que no hay tests que lo usen directamente.

### QW-03 — Mover URL hardcodeada a constants (~15min)

En `tenant-hosts.ts`:
```ts
export const BACKOFFICE_LEADS_URL = `https://${AUTH_HOST}/leads`;
```

En `create-lead-action.ts`:
```ts
import { BACKOFFICE_LEADS_URL } from "@/shared/constants/tenant-hosts";
// eliminar AGENT_NOTIFICATION_BACKOFFICE_URL local
```

### QW-04 — Eliminar EMAIL_STATUS objeto redundante (~30min)

`EMAIL_STATUS` (objeto) y `EMAIL_STATUSES` (array) en `db-enums.ts` son redundantes. Usar solo el array + derivar el tipo. Buscar todos los usos de `EMAIL_STATUS.PENDING` etc y reemplazar por las strings directas o por `EMAIL_STATUSES[0]` etc. Alternativa: mantener el objeto y eliminar el array.

### QW-05 — Añadir helper `requireAuth()` genérico (~1h)

Similar a `requireAdmin()` pero sin restricción de rol. Elimina la duplicación del patrón `getServerSession + AuthenticatedContext` en cada route handler:

```ts
// src/infrastructure/auth/require-auth.ts
export async function requireAuth(): Promise<AuthAuth> {
  const session = await getServerSession();
  if (!session) return { authorized: false, status: 401 };
  return {
    authorized: true,
    ctx: new AuthenticatedContext(session.tenantId, session.userId, session.role),
    session,
  };
}
```

---

## 13. Refactors Estratégicos

Cambios importantes que realmente merecen la pena (planificar en sprint dedicado):

### R-01 — Extraer PromocionContentBlockRepository

**Valor**: elimina el mayor God Object, facilita testing independiente de content blocks, permite caching específico.

**Separación propuesta**:
```
src/infrastructure/db/repositories/
  promocion.repository.ts          → solo CRUD de promociones
  promocion-content-block.repository.ts → CRUD + reorder + validate de blocks
  promocion-history.repository.ts  → historia de cambios
```

`PromocionRepository` puede delegar en los otros mediante inyección o composición. Las `syncTipologiasInTx` helpers pueden quedarse en `PromocionRepository` ya que son operaciones de negocio de la entidad.

**Coste**: 4-8h. **Riesgo de regresión**: Medio (hay 90+ tests). Hacer con TDD y garantizar que todos los tests existentes siguen pasando.

### R-02 — Migrar MediaService a TenantContext

**Valor**: consistencia arquitectónica, elimina el uso directo de `set_config` en `MediaService`.

El `MediaService` debería recibir un `TenantContext` en el constructor (como los repositories) y usar `ctx.withTransaction()`. Esto también facilitaría el QW-01 porque el upload route ya tendría el contexto correcto.

**Coste**: 2-3h. **Riesgo de regresión**: Bajo si los tests de media.service se actualizan.

### R-03 — Implementar batch UPDATE en reorder/delete

**Valor**: elimina N+1, reduce latencia de operaciones de arrastrar-y-soltar en el editor.

Para `reorderContentBlocks`, usar una única UPDATE con CASE:
```sql
UPDATE promocion_content_blocks
SET sort_order = CASE id
  WHEN $1 THEN 0
  WHEN $2 THEN 1
  ...
END
WHERE id IN ($1, $2, ...) AND tenant_id = $tenantId
```

Drizzle permite esto con `sql` template. Alternativamente, cambiar `sort_order` a `real` (float) y usar el algoritmo de posición fraccionaria para solo actualizar el bloque movido.

**Coste**: 2-4h. **Riesgo de regresión**: Bajo (lógica bien encapsulada y testeada).

### R-04 — Añadir key_prefix para API key validation

**Valor**: elimina el scan bcrypt O(n), hace el auth de API keys O(1) sobre el índice.

```sql
ALTER TABLE api_keys ADD COLUMN key_prefix VARCHAR(8);
UPDATE api_keys SET key_prefix = SUBSTRING(key_display, 1, 8); -- o bien el prefijo original
```

En `findMatchingApiKey`:
```ts
const candidates = await db.select().from(apiKeys)
  .where(and(eq(apiKeys.keyPrefix, plaintextKey.slice(0, 8)), eq(apiKeys.isActive, true)));
// solo bcrypt sobre candidates (típicamente 1)
```

**Coste**: 3-5h incluyendo migración de schema y backfill. **Riesgo de regresión**: Bajo, bien cubierto por tests.

---

## 14. Refactors NO recomendados

Esta sección es obligatoria y explica explícitamente qué **no** refactorizaría y por qué.

### No refactorizar: el sistema de tenant isolation (TenantContext / RLS)

El sistema de doble capa (AsyncLocalStorage + PostgreSQL RLS) puede parecer complejo, pero está correctamente justificado por los requisitos de multi-tenancy. Simplificarlo rompería la segunda línea de defensa que los tests de aislamiento verifican. **No tocar**.

### No migrar a Auth.js v5 ahora

`next-auth@4` está en producción estable. La migración a Auth.js v5 implica cambios en el API de `getServerSession`, en el config de middleware, y en los callbacks de JWT. El riesgo de regresión es alto. El valor es bajo a corto plazo. **Planificar para cuando next-auth@4 llegue a fin de soporte**, no antes.

### No extraer EmailService a un dominio propio

El servicio de email ya está bien encapsulado en `src/infrastructure/email/`. Moverlo a un bounded context propio añadiría capas sin valor real dado el tamaño del proyecto.

### No añadir un ORM de dominio o Value Objects

Algunos podrían sugerir wrappear las entidades de Drizzle en clases de dominio con Value Objects (DDD). Para un proyecto de este tamaño y en este stack (Next.js + Drizzle), añadiría una capa de traducción costosa y sin beneficio tangible. Los tipos de Drizzle (`$inferSelect`, `$inferInsert`) son suficientemente expresivos.

### No refactorizar los tests de integración para usar mocks en lugar de DB real

Los tests de integración usan una BD real y `fileParallelism: false`. Algunos podrían sugerir migrarlos a mocks para hacerlos más rápidos. **No hacerlo**: los tests contra BD real son los más valiosos de este proyecto porque verifican comportamientos de RLS y transacciones que los mocks nunca podrían simular.

### No normalizar los nombres de ficheros a PascalCase o kebab-case

La inconsistencia existe (3-4 ficheros PascalCase vs el resto kebab-case). Renombrarlos requeriría actualizar importaciones en toda la base de código y puede afectar a referencias en tests. El beneficio es únicamente estético. **Posponer indefinidamente**.

### No refactorizar PublicContext/AuthenticatedContext/ApiKeyContext a un factory pattern

Están bien como clases simples. Un factory no añadiría testabilidad ni simplicidad.

---

## 15. Roadmap

### Fase 1 — Quick Wins (Sprint actual, ~1 semana)

| # | Tarea | Esfuerzo |
|---|---|---|
| 1 | **Fix upload route** — migrar a NextAuth (DT-01, QW-01) | 1-2h |
| 2 | Añadir `requireAuth()` helper y usarlo en route handlers (QW-05) | 1h |
| 3 | Mover URL hardcodeada a `tenant-hosts.ts` (QW-03) | 15min |
| 4 | Eliminar `api-key-verifier.ts` (QW-02) | 5min |
| 5 | Eliminar `EMAIL_STATUS` objeto duplicado (QW-04) | 30min |

### Fase 2 — Refactors importantes (Sprint siguiente, ~1-2 semanas)

| # | Tarea | Esfuerzo |
|---|---|---|
| 1 | Eliminar código legacy de `context-middleware.ts` (mock auth, resolveTenantContext) | 2-3h |
| 2 | Extraer `PromocionContentBlockRepository` (R-01) | 4-8h |
| 3 | Migrar `MediaService` a `TenantContext` (R-02) | 2-3h |
| 4 | Implementar batch UPDATE en reorder/delete de blocks (R-03) | 2-4h |
| 5 | Extraer `PROMOCION_SELECT_COLUMNS` constante (DT-07) | 1h |

### Fase 3 — Mejoras opcionales (Backlog)

| # | Tarea | Esfuerzo |
|---|---|---|
| 1 | Añadir `key_prefix` para API key validation O(1) (R-04) | 3-5h |
| 2 | Extraer `PromocionHistoryRepository` de PromocionRepository | 2-3h |
| 3 | Planificar migración a Auth.js v5 | 8-12h |
| 4 | Añadir test de integración de upload con NextAuth real | 1-2h |
| 5 | Evaluar `float` sort_order para ordenación sin reindexar | 2h |

---

## 16. Score Final

### Puntuaciones (0-100)

| Dimensión | Score | Notas |
|---|---|---|
| **Arquitectura** | 78 | Clara y coherente, penalizada por God Object en PromocionRepository y arquitectura legacy de auth |
| **Simplicidad** | 72 | Buena en general, penalizada por N+1 en reorder y scan bcrypt lineal |
| **Mantenibilidad** | 80 | Buena organización por features, buen naming, penalizada por PromocionRepository monolítico |
| **Cohesión** | 75 | Los módulos de feature son cohesivos; PromocionRepository rompe la tendencia |
| **Acoplamiento** | 82 | Dependencias bien dirigidas (features → infrastructure → shared), sin ciclos |
| **Legibilidad** | 85 | Código bien comentado, nombres descriptivos, TypeScript strict |
| **Calidad del diseño** | 80 | Patron tenant isolation excelente, email async bien diseñado, rate limiting correcto |
| **Deuda técnica** | 72 | Bug crítico en upload pesa mucho; el resto es manejable |

### Score Global: **78 / 100**

### Grade: **B+**

**Explicación**: Domio es un proyecto de calidad considerablemente por encima del promedio para su etapa. La infraestructura de testing (especialmente los tests de aislamiento RLS y de contrato) es ejemplar y poco habitual incluso en proyectos mucho más maduros. El diseño de tenant isolation, el sistema de email asíncrono y el rate limiting con fail-open son decisiones de arquitectura correctas y bien ejecutadas.

Lo que impide el A es principalmente el bug crítico de producción en el upload route (que impide una funcionalidad core), el God Object de `PromocionRepository` que ya acumula demasiada complejidad, y algunos patrones de rendimiento (N+1, bcrypt scan) que deberán abordarse antes de que el volumen de datos crezca.

Con las Fases 1 y 2 del roadmap completadas, este proyecto alcanzaría fácilmente un **A-** (88/100).
