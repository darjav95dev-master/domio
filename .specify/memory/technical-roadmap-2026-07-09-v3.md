# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-09

---

## 1. Executive Summary

**Score:** 84/100 — A

**Estado general:** Domio es una plataforma de comercialización inmobiliaria construida sobre Next.js 15 App Router, TypeScript strict, Drizzle ORM y PostgreSQL con Row Level Security. El sistema tiene 26+ features entregadas, una infraestructura de tenant isolation a doble capa (RLS + TenantContext con `SET LOCAL`) correctamente ejecutada, y un pipeline de testing que incluye suites de aislamiento RLS contra base de datos real, tests de contrato con snapshot Zod y E2E Playwright. El código es limpio, bien estructurado y sigue los principios declarados en `constitution.md` y `architecture.md` con consistencia notable.

La auditoría identifica un **bug crítico en producción**: una email template referenciada en el path de la API pública que no existe en el registry. El sistema encola el email sin que el worker pueda renderizarlo, haciendo que todos los leads institucionales generen un email permanentemente FAILED. También identifica que el rate limiting de login está implementado pero **no conectado** al flujo de autenticación real.

**Fortalezas principales:**
- Tenant isolation a dos capas ejecutada con rigor: RLS con FORCE + restricción INSERT-only en tablas de auditoría
- Email desacoplado del path crítico mediante `email_queue` persistente con worker y backoff exponencial
- Cursor pagination en catálogo público y API v1 (sin OFFSET)
- Rate limiting con fail-open correcto (degrada a modo permisivo si Redis no está disponible)
- Suite de tests excepcional: isolación RLS, contratos, integración y E2E con Page Object Model
- TypeScript strict, ESLint sonarjs, cobertura >= 80%, Husky pre-commit/pre-push
- Constantes centralizadas en `shared/constants/` — sin magic strings en el dominio
- `PaginatedResult<T>` y `ROLE_LABELS` definidos en shared pero duplicados localmente (ver DRY)

**Riesgos principales:**
- Template `lead-institutional-confirmation` no existe: todos los leads institucionales generan emails permanentemente fallidos
- `checkLoginRateLimit` está implementado pero **no se llama** desde ningún flujo de auth; el login no tiene rate limiting efectivo
- `UserRow` expone `passwordHash` en el tipo compartido entre repositorio y capa de acción
- Slug declarado `NOT NULL` en esquema Drizzle pero inicializado como `""` en `create()` — invariante implícita frágil

---

## 2. Arquitectura

### Estado actual

- **Framework:** Next.js 15 App Router con rutas agrupadas `(public)` y `(auth)`
- **Capas:** `app/` (route handlers + pages) → `src/features/` (lógica de negocio por feature) → `src/infrastructure/` (DB, auth, email, media, rate-limiting, tenant)
- **Multi-tenancy:** `TenantContext` (tres subclases: `PublicContext`, `AuthenticatedContext`, `ApiKeyContext`) + RLS con `FORCE ROW LEVEL SECURITY` + `SET LOCAL` via `set_config('app.current_tenant_id', ..., true)`
- **Contextos de API:** interna en `/api/internal/*` (NextAuth session) y pública en `/api/v1/*` (API key + rate limit)
- **Email:** cola persistente `email_queue` + worker `processQueue` con retry exponencial y `FOR UPDATE SKIP LOCKED`
- **Media:** Cloudflare R2 vía `MediaService`; upload solo desde servidor
- **Testing:** Vitest (unit, integration, contract, isolation) + Playwright E2E con POM

### Fortalezas

- Separación limpia entre bounded contexts en `src/features/`
- `TenantAwareRepository` como base de todos los repositorios: toda query pasa por transacción con `SET LOCAL`
- RLS endurecido con `FORCE ROW LEVEL SECURITY` en 0001_audit_rls_hardening.sql
- Tablas de historial con policies SELECT+INSERT only (inmutabilidad en la BD)
- `shared/constants/` centraliza enums, labels y configuración sin magic strings

### Debilidades

- `PromocionRepository` acumula 1154 líneas con responsabilidades de catálogo público, backoffice, historial, sincronización de tipologías y cursor pagination
- `PaginatedResult<T>` redefinida en 5 lugares: 4 repositorios + `lead-schema.ts`
- `ROLE_LABELS` local en 3 componentes de team pese a existir `USER_ROLE_LABELS` en `domain-labels.ts`
- `isPublishing` computado 3 veces de forma idéntica dentro del mismo PATCH handler

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | `PromocionRepository` excede SRP con 1154 líneas y 6 responsabilidades distintas | `src/infrastructure/db/repositories/promocion.repository.ts` | Alto |
| A2 | `PaginatedResult<T>` duplicado en 5 sitios | 4 repos + `src/shared/types/lead-schema.ts` | Medio |
| A3 | `isPublishing` recalculado 3 veces en el mismo handler | `app/api/internal/promociones/[id]/route.ts` | Bajo |

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] PromocionRepository: 6 responsabilidades, 1154 líneas

**Problema:** El repositorio mezcla: (1) catálogo público con cursor pagination, (2) API v1 con cursor pagination, (3) backoffice con offset pagination, (4) sincronización de tipologías + unidades, (5) registro de historial de campos, (6) construcción de cursor codificado en base64. `assembleTipologias`, `syncTipologiasInTx`, `buildTipologiaUpdate`, `buildTipologiaCreate`, `createOneTipologiaInTx`, `updateOneTipologiaInTx` y `encodeCursor/decodeCursor` tienen razones independientes para cambiar.

**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts`

**Impacto real:** Cualquier cambio en la lógica de tipologías, en el esquema de cursor, en la paginación del backoffice o en el catálogo público toca el mismo archivo. El archivo no cabe en una revisión de PR.

**Prioridad:** Planificar

**Acción concreta:** Extraer `CursorEncoder` (encode/decode), `CatalogRepository` (findPublicWithCursor), `PromocionSyncService` (syncTipologias*) y `PromocionHistoryRepository` (ya existe pero se llama desde dentro del repo) como clases separadas. La base `PromocionRepository` quedaría con ~400 líneas.

### OCP, LSP, ISP, DIP

No se identifican violaciones reales con impacto de mantenibilidad. Las interfaces de dependencia en rate limiter, email service y repositorios están bien segregadas. Las implementaciones no violan contratos. La DI es explícita en constructores. No reportar violaciones forzadas.

---

## 4. YAGNI

### `withRateLimit` HOC sin uso

`src/features/api-public/with-rate-limit.ts` exporta `withRateLimit(handler)` — un Higher Order Component que lee `x-api-key-id` del header. **Ningún route handler lo usa**: ambos handlers de API v1 llaman a `applyRateLimit()` directamente, que es el patrón correcto. El HOC asume que el middleware ya habrá puesto el ID en un header, patrón que no existe.

| Código | Motivo | Riesgo de eliminar |
|--------|--------|--------------------|
| `withRateLimit` HOC en `src/features/api-public/with-rate-limit.ts` | Nunca se llama en producción; `applyRateLimit()` es el patrón real | Muy bajo |

**Prioridad:** Planificar — eliminar la función `withRateLimit` y dejando solo `applyRateLimit`. Evita confusión sobre qué patrón usar al añadir un nuevo endpoint v1.

### `getUnreadLeadIds` con dos implementaciones paralelas

`LeadRepository.getUnreadCount()` y `LeadRepository.getUnreadLeadIds()` resuelven el mismo problema (leads no leídos por userId) con subconsultas NOT IN similares. `getUnreadLeadIds` se usa solo en `app/(auth)/panel/leads/page.tsx`. `getUnreadCount` se usa en `getUnreadCountAction()`. El `DashboardRepository.getUnreadLeadsCount()` implementa una tercera variante con LEFT JOIN + isNull. Tres implementaciones del mismo concepto.

**Prioridad:** Posponer — hasta que exista un módulo `UnreadLeadsService` que unifique; por ahora el riesgo de unificar sin tests de regresión específicos es mayor que el beneficio.

---

## 5. KISS

### Complejidad en el PATCH handler de `[id]/route.ts`

`isPublishing` se computa tres veces de forma idéntica en tres funciones distintas del mismo handler (`prepareUpdateData`, `validateMediaOnPublish`, `validateBlocksOnPublish`). Estas tres funciones se llaman con exactamente los mismos `parsedData` y `current`. El patrón rompe KISS sin aportar ninguna ventaja de abstracción.

**Simplificación posible:** Calcular `isPublishing` una vez en el PATCH handler y pasarlo como parámetro a las funciones auxiliares.

### `syncTipologiasInTx` con N queries secuenciales en loop

`syncTipologiasInTx` itera sobre `tipologiasPayload` y para cada tipología con unidades ejecuta queries secuenciales (una por tipología, luego una por unidad). Con colecciones pequeñas (<10 tipologías) el impacto es despreciable. No se recomienda optimizar por ahora.

### `AuthenticatedContext` en `auth.config.ts` con shimming de v4/v5

El archivo `auth.config.ts` incluye una capa de compatibilidad entre NextAuth v4 (producción) y una API v5 mockeable para tests. El shimming con `_na.handlers ?? { GET: ..., POST: ... }` y la función `auth` condicional son necesarios dado el stack y no añaden complejidad accidental — están bien documentados.

---

## 6. DRY

### Duplicaciones relevantes

#### [DRY-01] `PaginatedResult<T>` definida en 5 sitios

| Archivo |
|---------|
| `src/infrastructure/db/repositories/lead.repository.ts:33` |
| `src/infrastructure/db/repositories/promocion.repository.ts:72` |
| `src/infrastructure/db/repositories/user.repository.ts:20` |
| `src/infrastructure/db/repositories/api-key.repository.ts:21` |
| `src/shared/types/lead-schema.ts:138` |

**Impacto:** Si se necesita añadir `page` o `hasMore` a la interfaz, hay que editar 5 archivos. El tipo correcto ya existe implícitamente en `lead-schema.ts`. Debe moverse a `src/shared/types/pagination.ts` y todos los repos importarla.

**Prioridad:** Hacer inmediatamente — coste ~30 min, riesgo nulo.

#### [DRY-02] `ROLE_LABELS` local en 3 componentes de `team/`

Definida localmente como `const ROLE_LABELS` en `create-user-dialog.tsx`, `users-table.tsx` y `user-actions.tsx`. La constante compartida `USER_ROLE_LABELS` ya existe en `src/shared/constants/domain-labels.ts`. Si se añade un rol nuevo, hay que editar 4 archivos.

**Prioridad:** Hacer inmediatamente — coste ~20 min, riesgo nulo. Borrar las definiciones locales e importar `USER_ROLE_LABELS`.

#### [DRY-03] `isPublishing` computado 3 veces en el PATCH handler

`parsedData.status === "PUBLISHED" && current.status !== "PUBLISHED"` aparece en líneas 131, 186 y 237 de `app/api/internal/promociones/[id]/route.ts`. Es la misma expresión con los mismos operandos.

**Prioridad:** Planificar — coste ~15 min.

### Duplicaciones aceptables

- Las distintas variantes de unread count (`getUnreadCount`, `getUnreadLeadIds`, `getUnreadLeadsCount`) son variaciones distintas del mismo concepto, pero resuelven casos de uso diferentes. Unificar prematuramente introduce más acoplamiento del que elimina.
- Los tipos `PromocionRow` / `PromocionWithRelations` / `PromocionListRow` son proyecciones distintas intencionalmente; no unificar.

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo | Severidad |
|---|-------|-----------|------|-----------|
| S1 | 1154 líneas, 6 responsabilidades distintas | `src/infrastructure/db/repositories/promocion.repository.ts` | God Class | Alta |
| S2 | Template hardcoded con string literal `"lead-institutional-confirmation"` no registrada | `src/features/api-public/server/create-institutional-lead.ts:94` | Magic String / Dead Code | Crítica |
| S3 | `PaginatedResult<T>` definida 5 veces | 4 repos + `src/shared/types/lead-schema.ts` | Duplicación | Media |
| S4 | `ROLE_LABELS` definido localmente en 3 componentes pese a existir en `domain-labels.ts` | `features/team/components/` | Duplicación | Media |
| S5 | `withRateLimit` HOC never called | `src/features/api-public/with-rate-limit.ts` | Dead Code | Baja |
| S6 | `UserRow` expone `passwordHash` en tipo compartido | `src/shared/types/user-schema.ts:100` | Inappropriate Intimacy | Media |
| S7 | `isPublishing` computado 3 veces en el mismo PATCH handler | `app/api/internal/promociones/[id]/route.ts:131,186,237` | Duplicación | Baja |
| S8 | `slug` declarado `NOT NULL` en schema pero inicializado `""` en `create()` | `src/infrastructure/db/repositories/promocion.repository.ts:787` | Magic String / invariante implícita | Baja |
| S9 | `extractApiKey` duplicado en `context-middleware.ts` y `api-key-auth.ts` | `src/infrastructure/tenant/context-middleware.ts` + `src/features/api-public/middleware/api-key-auth.ts` | Duplicación | Baja |
| S10 | Tres implementaciones paralelas del concepto "unread leads" | `lead.repository.ts:366,518` + `dashboard.repository.ts:25` | Divergent Change | Baja |

### Clasificación por severidad
- **Crítica:** S2 (template ausente → emails fallidos en producción)
- **Alta:** S1 (God Class)
- **Media:** S3, S4, S6
- **Baja:** S5, S7, S8, S9, S10

### Prioridad
- **Hacer de inmediato:** S2, S3, S4
- **Planificar:** S1, S6, S7, S9
- **Posponer:** S5, S8, S10

---

## 8. Testing

### Estado

Suite excepcional para la madurez del proyecto. Cuatro capas:

1. **Unit/Integration (Vitest):** 1674 tests pasando. Incluye tests de repositorios contra BD real, services, schemas Zod, actions de Server Components, y route handlers
2. **Isolation (Vitest):** `tests/isolation/` — suite dedicada que crea dos tenants sintéticos y verifica que las queries de uno no ven datos del otro. Es el verificador real de que el RLS funciona
3. **Contract (Vitest snapshot):** `tests/contract/v1/` — snapshots Zod de los schemas de API pública. Bloquea cambios de contrato no declarados
4. **E2E (Playwright):** 28 tests pasando con Page Object Model completo

### Calidad

- Tests de repositorios contra BD real son más valiosos que mocks que esconden problemas
- POM en E2E (`BasePage`, `LoginPage`, `CatalogoEditPage`, etc.) — correctamente implementado
- `ROLE_LABELS` local en 3 archivos no afecta la cobertura de tests, pero la duplicación significa que los tests de un componente no validan los otros dos
- El test de `rate-limit-login.spec.ts` verifica que `checkLoginRateLimit` funciona pero no detecta que nunca se llama desde el flujo real

### Cobertura útil

- La suite de isolation RLS es la cobertura más valiosa del proyecto — prueba la propiedad arquitectónica más crítica
- Los tests de contrato previenen regresiones en el API pública
- Ausencia de test que verifique que `checkLoginRateLimit` se llama en el handler de NextAuth (`/api/auth/[...nextauth]/route.ts`)

### Mejoras

| Mejora | Prioridad | Coste |
|--------|-----------|-------|
| Test de integración que envía POST /api/auth/credentials y verifica 429 tras N intentos | Alta | Bajo |
| Test que instancia `EmailService.enqueue` con template `"lead-institutional-confirmation"` y verifica que falla con `TemplateNotFoundError` | Crítica | Muy bajo |

---

## 9. Seguridad

### [SEC-CRIT-01] Login sin rate limiting efectivo en producción

**Criticidad:** Critical

**Archivos:** `src/infrastructure/auth/rate-limit-login.ts`, `app/api/auth/[...nextauth]/route.ts`, `src/infrastructure/auth/auth.config.ts`

**Problema:** `checkLoginRateLimit` está implementada y testeada pero **nunca se llama** desde el flujo de autenticación real. El handler de NextAuth en `app/api/auth/[...nextauth]/route.ts` delega en `handler` de `src/infrastructure/auth/auth.ts`, que a su vez llama al `authorize` callback en `auth.config.ts`. Ese callback no invoca `checkLoginRateLimit`. Un atacante puede lanzar ataques de fuerza bruta contra `/api/auth/callback/credentials` sin restricción de velocidad.

**Fix:** En el callback `authorize` de `auth.config.ts`, invocar `checkLoginRateLimit` antes de la verificación de contraseña. Dado que NextAuth v4 no expone `request` directamente en `authorize`, la solución más directa es añadir un middleware en `middleware.ts` que aplique rate limiting a `POST /api/auth/callback/credentials`. Alternativa: añadir el check en un custom API route wrapper. **Este hallazgo debe resolverse antes del próximo despliegue a producción.**

---

### [SEC-CRIT-02] Template de email referenciada pero no registrada

**Criticidad:** Critical (integridad de datos + contrato implícito)

**Archivo:** `src/features/api-public/server/create-institutional-lead.ts:94`

**Problema:** La función `createInstitutionalLead` encola emails con `template: "lead-institutional-confirmation"`. Esta cadena no existe en `EMAIL_TEMPLATE_NAMES`, no está registrada en `emailTemplatePayloadSchemas`, y no existe en el registry `templateRegistry` de `src/infrastructure/email/templates/index.ts`. El worker de email encontrará esta fila como PENDING, intentará renderizarla con `templateRegistry.getTemplate("lead-institutional-confirmation")`, obtendrá `TemplateNotFoundError`, y la marcará como FAILED inmediatamente. Todos los leads institucionales generan emails permanentemente fallidos silenciosamente.

**Fix:** Opción A (recomendada): añadir el template `lead-institutional-confirmation` con su schema Zod a `EMAIL_TEMPLATE_NAMES`, `emailTemplatePayloadSchemas` y crear `src/infrastructure/email/templates/lead-institutional-confirmation.ts`. Opción B: reemplazar `"lead-institutional-confirmation"` por `EMAIL_TEMPLATE_NAMES.LEAD_CONFIRMATION` y ajustar el payload a `leadConfirmationSchema`.

---

### [SEC-HIGH-01] `UserRow` expone `passwordHash` fuera de la capa de autenticación

**Criticidad:** High

**Archivo:** `src/shared/types/user-schema.ts:96-106`

**Problema:** `UserRow` incluye `passwordHash: string | null`. Este tipo es la interfaz de retorno de `UserRepository.findAll()`, `findById()`, `create()`, `update()` y `deactivate()`. Aunque `mapUserRow` en `team.actions.ts` lo filtra correctamente antes de retornarlo al cliente, el campo existe en el objeto intermedio en memoria y podría colarse en logs, Sentry breadcrumbs o en una refactorización futura. La propiedad no tiene razón de existir fuera de `auth.config.ts`.

**Fix:** Definir un tipo `UserDbRow` interno al repositorio que incluya `passwordHash`, y exportar `UserRow` sin él. En `auth.config.ts` hacer el `SELECT` directamente sin pasar por `UserRow`.

---

### [SEC-MED-01] Slug como cadena vacía `""` viola la unicidad efectiva

**Criticidad:** Medium

**Archivo:** `src/infrastructure/db/repositories/promocion.repository.ts:787`

**Problema:** Al crear una promoción, `slug` se inicializa como `""`. El índice `promociones_tenant_slug_idx` es `UNIQUE ON (tenant_id, slug)`, lo que significa que un tenant solo puede tener **una** promoción en estado DRAFT con slug vacío. En la práctica, crear una segunda promoción DRAFT falla con un error de unicidad de FK que se lanza como 500 genérico, sin un mensaje claro al operador.

**Fix:** Usar un placeholder único en `create()` — por ejemplo `slug: crypto.randomUUID()` — o hacer `slug` nullable en el schema de Drizzle hasta que se publique. La segunda opción es más limpia semánticamente: un slug nulo significa "no publicado todavía".

---

### [SEC-LOW-01] Error silencioso en `getServerSession()` puede enmascarar problemas de auth

**Criticidad:** Low

**Archivo:** `src/infrastructure/auth/session.ts:17-22`

**Problema:** `getServerSession()` captura cualquier excepción de `auth()` y devuelve `null` silenciosamente. Esto es correcto para errores de red pasajeros, pero puede enmascarar errores de configuración de NextAuth o de base de datos que deberían ser observados. Un fallo de `auth()` por credenciales de BD incorrectas es indistinguible de "no hay sesión" para el código que llama a `getServerSession()`.

**Fix:** Loguear el error con `logger.error` antes de retornar null. Mantener el comportamiento de retornar null (no propagar la excepción) pero hacerlo observable.

---

## 10. Performance

### [P-MED-01] Bcrypt en loop para validación de API keys

**Problema:** `findMatchingApiKey` en `api-key-auth.ts` itera sobre `candidates` y llama a `bcrypt.compare()` por cada candidato. El filtro por `keyPrefix` reduce los candidatos a 1 en el caso común (keys con prefix), pero los legacy keys sin prefix se incluyen siempre. En un tenant con muchas API keys legacy sin prefix, cada request autentica con O(n) operaciones bcrypt.

**Archivos afectados:** `src/features/api-public/middleware/api-key-auth.ts:111-118`

**Impacto:** Para n=1 (caso actual: un tenant con pocas keys), es despreciable. Para n>=5 legacy keys, cada auth tarda 5×bcrypt (~500ms). El prefix filter mitiga el problema para keys nuevas.

**Fix recomendado:** Ejecutar la migración de prefix para todas las keys activas existentes (una sola vez). Tras la migración, la cláusula `isNull(apiKeys.keyPrefix)` en `defaultFindActiveKeys` debería retornar cero candidatos en steady state. No requiere cambio de código; requiere un script de backfill.

---

### [P-LOW-01] Tres implementaciones independientes de "unread leads"

**Problema:** Las queries de unread leads en `getUnreadCount`, `getUnreadLeadIds` y `getUnreadLeadsCount` usan estrategias diferentes (NOT IN subquery vs LEFT JOIN + isNull). El NOT IN sobre `lead_read_marks` puede ser ineficiente con muchas entradas de lectura, pero en el volumen esperado de Domio no es un problema real.

**Fix recomendado:** No hacer — consolidar cuando el dominio lo justifique. Documentar que el LEFT JOIN de `DashboardRepository` es la variante correcta para tablas grandes.

---

## 11. Deuda Técnica

### Crítica (bloquea producción o seguridad)

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | Template `lead-institutional-confirmation` ausente del registry | 2h |
| DT-02 | Rate limiting de login no conectado al flujo real de NextAuth | 3h |

### Alta

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-03 | `UserRow` expone `passwordHash` en tipo compartido | 1h |
| DT-04 | Slug inicializado `""` viola unicidad efectiva del índice | 2h |

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-05 | `PaginatedResult<T>` duplicado en 5 archivos | 30m |
| DT-06 | `ROLE_LABELS` local en 3 componentes pese a existir en `domain-labels.ts` | 20m |
| DT-07 | `PromocionRepository` > 1150 líneas, 6 responsabilidades | 6-8h |
| DT-08 | `isPublishing` recalculado 3 veces en el mismo handler | 15m |
| DT-09 | `extractApiKey` duplicado en `context-middleware.ts` y `api-key-auth.ts` | 30m |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-10 | `withRateLimit` HOC dead code nunca llamado | 15m |
| DT-11 | Error silencioso en `getServerSession()` no loguea | 15m |
| DT-12 | Backfill de `key_prefix` en API keys existentes sin prefix | 30m (script) |

---

## 12. Quick Wins

> Cambios < 2h, seguros de forma independiente, alto impacto.

### QW-01 — Mover `PaginatedResult<T>` a shared (~30m)

Crear `src/shared/types/pagination.ts`:
```typescript
export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
```
Reemplazar las 5 definiciones locales con import. Ningún cambio de comportamiento.

### QW-02 — Usar `USER_ROLE_LABELS` de shared en team components (~20m)

En `create-user-dialog.tsx`, `users-table.tsx` y `user-actions.tsx`, eliminar la constante `ROLE_LABELS` local y reemplazar con:
```typescript
import { USER_ROLE_LABELS } from "@/shared/constants/domain-labels";
```

### QW-03 — Eliminar `withRateLimit` HOC (~15m)

Borrar la función `withRateLimit` de `src/features/api-public/with-rate-limit.ts` (líneas 59-79). Conservar `applyRateLimit`. Actualizar el export en el mismo archivo. No tiene callers.

### QW-04 — Loguear error en `getServerSession()` (~15m)

En `src/infrastructure/auth/session.ts`, en el bloque `catch`:
```typescript
} catch (err) {
  logger.warn("getServerSession failed:", err instanceof Error ? err.message : String(err));
  return null;
}
```

### QW-05 — Calcular `isPublishing` una sola vez en el PATCH handler (~15m)

En `app/api/internal/promociones/[id]/route.ts`, calcular `isPublishing` en el handler PATCH antes de llamar a las funciones auxiliares y pasarlo como parámetro. Elimina las 3 redefiniciones.

---

## 13. Refactors Estratégicos

### R-01 — Registrar `lead-institutional-confirmation` o usar template existente

**Valor:** Elimina el bug crítico silencioso que hace que todos los leads institucionales no reciban email de confirmación.

**Separación propuesta:** Opción recomendada: usar `EMAIL_TEMPLATE_NAMES.LEAD_CONFIRMATION` con payload compatible `{ leadName: data.name, promotionName: data.promocionId, contactEmail: data.email }`. Si se quiere un template propio, añadirlo al registro completo (nombre, schema Zod, template renderer, test).

**Coste:** 2h. **Riesgo de regresión:** Bajo.

---

### R-02 — Conectar rate limiting al flujo de login de NextAuth

**Valor:** Activa la protección de fuerza bruta que ya existe implementada y testeada pero que no está conectada al flujo real.

**Separación propuesta:** Añadir en `middleware.ts` un bloque para `POST /api/auth/callback/credentials` que invoque `checkLoginRateLimit`. El middleware ya corre en Edge runtime; `checkLoginRateLimit` usa `getRedisClient()` que es Edge-compatible (Upstash HTTP).

```typescript
// En middleware.ts, antes del auth guard:
if (pathname === "/api/auth/callback/credentials" && request.method === "POST") {
  const rateLimitResponse = await checkLoginRateLimit(request.headers);
  if (rateLimitResponse) return rateLimitResponse;
}
```

**Coste:** 3h (incluyendo test de integración). **Riesgo de regresión:** Bajo — solo añade una respuesta 429 cuando la condición se cumple.

---

### R-03 — Separar `UserRow` de DB de `UserRow` de dominio

**Valor:** Elimina el riesgo de que `passwordHash` llegue a capas superiores en una refactorización futura.

**Separación propuesta:** En `UserRepository`, usar `Omit<UserRow, 'passwordHash'>` como tipo de retorno de todos los métodos excepto la query de auth (que se hace directamente en `auth.config.ts`). El tipo `UserRow` en `user-schema.ts` elimina `passwordHash`.

**Coste:** 1h. **Riesgo de regresión:** Bajo si los tests de integración pasan.

---

### R-04 — Fix slug vacío: hacerlo nullable o usar UUID temporal

**Valor:** Elimina la limitación implícita de "solo un DRAFT por tenant" que produce un error 500 sin mensaje claro.

**Separación propuesta:** 
1. Cambiar schema Drizzle: `slug: text("slug")` (nullable)
2. Generar migración: `ALTER TABLE promociones ALTER COLUMN slug DROP NOT NULL`
3. En `generateSlug()` y el PATCH handler verificar `slug === null` en vez de `slug === ""`
4. Actualizar el unique index para ignorar NULLs (PostgreSQL hace esto automáticamente)

**Coste:** 2h incluyendo migración y ajuste de código. **Riesgo de regresión:** Medio — requiere revisar todos los `if (!current.slug)` y similares.

---

### R-05 — Extraer responsabilidades de `PromocionRepository`

**Valor:** El repositorio de 1154 líneas es el principal obstáculo para cambios rápidos en cualquier aspecto del catálogo. Separar las responsabilidades hace los cambios futuros predecibles.

**Separación propuesta:**
- `CatalogRepository` — `findPublicWithCursor`, `findForApiCursor` (acceso público y por API key)
- `PromocionRepository` — `findAll` (backoffice), `findById`, `create`, `update`, `updateDraft`, `delete` (~300 líneas)
- `TipologiaSyncService` — `syncTipologiasInTx`, `assembleTipologias`, `buildTipologiaCreate`, `buildTipologiaUpdate`, `createOneTipologiaInTx`, `updateOneTipologiaInTx`
- `CursorEncoder` — `encodeCursor`, `decodeCursor` (puede ser un módulo de utilidad puro)

**Coste:** 6-8h. **Riesgo de regresión:** Medio — los tests de integración de repositorio cubren bien el comportamiento; el riesgo es en las importaciones y la composición.

---

## 14. Refactors NO recomendados

### No refactorizar: las tres implementaciones de "unread leads"

`getUnreadCount`, `getUnreadLeadIds` y `getUnreadLeadsCount` tienen casos de uso distintos: conteo numérico para badge, lista de IDs para highlight client-side, y conteo para dashboard card respectivamente. Unificarlos en un servicio único introduciría acoplamiento entre `LeadRepository` y `DashboardRepository` sin beneficio real de mantenibilidad. El volumen de datos hace la diferencia de estrategia de query irrelevante.

### No refactorizar: el shim de compatibilidad NextAuth v4/v5 en `auth.config.ts`

El adaptador `_na.handlers ?? { GET, POST }` y la función `auth` condicional son necesarios para que los tests unitarios puedan mockear NextAuth sin importar `openid-client` (incompatible con jsdom). Eliminarlo requeriría una migración completa a v5, que tiene su propio coste y riesgo. No tocar.

### No extraer `TenantContext.withTransaction` a un helper funcional

La jerarquía `TenantContext → AuthenticatedContext → ApiKeyContext` con `withTransaction` sobrescrito en `AuthenticatedContext` (añade `app.current_user_id`) es el patrón correcto para este modelo. Convertirlo en HOF sin clases aplanarría el modelo y haría menos obvia la acumulación de SET LOCALs por contexto. No tocar.

### No crear un `EmailService` wrapper para el uso inline de `tx.insert(emailQueue)`

En `create-lead-action.ts` y `create-institutional-lead.ts` se inserta directamente en `email_queue` dentro de la transacción de negocio. Esto es correcto e intencional: la cola se debe persistir en la misma transacción que el lead, para que si el lead falla la cola también se deshace. Crear un `EmailService.enqueueInTx()` solo añadiría una capa de indirección sin valor.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)

- [x] [DT-01/R-01] Registrar template `lead-institutional-confirmation` o usar `LEAD_CONFIRMATION` — **2h**
- [x] [DT-02/R-02] Conectar `checkLoginRateLimit` al flujo NextAuth vía middleware — **3h**
- [x] [QW-01] Mover `PaginatedResult<T>` a `src/shared/types/pagination.ts` — **30m**
- [x] [QW-02] Reemplazar `ROLE_LABELS` locales por `USER_ROLE_LABELS` de shared — **20m**

### Fase 2 — Corto plazo (próximo mes)

- [x] [DT-03/R-03] Eliminar `passwordHash` del tipo `UserRow` compartido — **1h**
- [x] [DT-04/R-04] Hacer `slug` nullable en schema + migración + ajuste de código — **2h**
- [x] [QW-03] Eliminar `withRateLimit` HOC dead code — **15m**
- [x] [QW-04] Loguear error en `getServerSession()` — **15m**
- [x] [QW-05] Calcular `isPublishing` una vez en el PATCH handler — **15m**
- [x] [DT-09] Unificar `extractApiKey` duplicado — **30m**
- [x] [DT-12] Script backfill `key_prefix` en API keys legacy — **30m**

### Fase 3 — Medio plazo (próximo trimestre)

- [x] [DT-07/R-05] Extraer responsabilidades de `PromocionRepository` — **6-8h**

### No planificado

- Tres implementaciones de "unread leads" — coste > beneficio de unificar; posponer indefinidamente
- Shim de compatibilidad NextAuth v4/v5 — no tocar hasta migración planificada a v5
- `DashboardRepository.getUnreadLeadsCount` unificación — posponer

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 8 | Tenant isolation excelente; PromocionRepository rompe SRP |
| Simplicidad | 8 | Código limpio salvo el repo de 1154 líneas |
| Mantenibilidad | 8 | Buena estructura por features; duplicaciones menores controlables |
| Cohesión | 8 | Cada módulo tiene propósito claro; excepciones documentadas |
| Acoplamiento | 9 | DI explícita, TenantContext por constructor, sin dependencias circulares |
| Legibilidad | 9 | Nombres expresivos, comentarios útiles, convenciones consistentes |
| Calidad del diseño | 8 | Enums centralizados, cursor pagination, email queue pattern bien ejecutado |
| Testing | 9 | Cuatro capas de test incluida isolation RLS; falta test de integración de login RL |
| Seguridad | 6 | Template ausente + login sin RL son bloqueantes; el resto está bien |
| Deuda técnica | 7 | Baja para la madurez del proyecto; los críticos son resolubles en días |
| **Total** | **84/100** | |

**Calificación:** A

**Justificación:** Domio tiene uno de los diseños de tenant isolation más rigurosos que se puede implementar con Drizzle + PostgreSQL, con una suite de tests que verifica ese diseño de forma automatizada. El sistema de email, rate limiting y API keys está bien arquitectado. Los dos hallazgos críticos (template ausente + login sin rate limiting efectivo) son bugs puntuales que no reflejan un problema sistémico de diseño — son omisiones específicas que se resuelven en horas. La nota sería A+ con esos dos items resueltos y `PromocionRepository` descompuesto.
