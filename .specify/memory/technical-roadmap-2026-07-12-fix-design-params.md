# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-12
> Rama auditada: `fix/design-params`
> Archivo modificado en rama: `src/features/engagement/components/ContactForm.tsx`

---

## 1. Executive Summary

**Score:** 76 — **B**

**Estado general:** Domio es una aplicación Next.js 15 bien estructurada con una arquitectura sólida, patrones de seguridad correctos y una separación de capas que se respeta en el 95 % del código. El modelo multi-tenant con RLS está correctamente implementado vía `TenantContext`, los tests cubren las rutas críticas y la infraestructura de emails es asíncrona y resiliente. Los déficits que bajan la nota son puntuales pero con impacto real: la acción de creación de lead desde el formulario público no filtra por `tenantId` en el `WHERE` de la consulta a `promociones` (RLS lo cubre en producción pero el test de aislamiento no lo valida), el campo `user_agent` no se recoge en el registro de consentimiento RGPD del formulario comercial (sí se recoge en el institucional), la página `/favoritos` hace `limit: 100` sobre el catálogo completo para filtrar en cliente, y `BlockDescripcion` usa `dangerouslySetInnerHTML` con validación solo de tags sin sanitización de atributos de evento. Ninguno de estos problemas bloquea producción hoy; todos tienen coste de fix bajo.

**Fortalezas principales:**
- Arquitectura de capas clara y consistente: `infrastructure → shared → features → app`
- `TenantContext` + `withTransaction` + `SET LOCAL` implementados correctamente para PgBouncer
- Rate limiting con degradación graceful en Redis, scope por IP y por API key
- Consentimiento RGPD registrado atómicamente en la misma transacción que el lead
- Email desacoplado mediante `email_queue` (constitution §11.3 respetada)
- RLS activado en todas las tablas de dominio con `enableRLS()` y `tenantIsolationPolicy`
- ESLint + SonarJS + jsx-a11y activos y con reglas concretas; Husky con pre-commit y pre-push
- Accesibilidad bien tratada: skip-to-content, `aria-live`, `aria-invalid`, `focus-visible`, labels asociados
- Vitest con umbral 80 % en coverage, tests de contrato de la API pública y tests de aislamiento de tenant
- Enums cerrados en `shared/constants/db-enums.ts` usados consistentemente

**Riesgos principales:**
- `createLeadService` no filtra por `tenantId` en el `WHERE` de la query a `promociones` (RLS es la única barrera)
- `BlockDescripcion.dangerouslySetInnerHTML` valida tags pero no sanitiza atributos de evento (`onmouseover`, `onclick`, etc.)
- `/favoritos` descarga hasta 100 promociones para filtrar en cliente, sin límite de escala
- `user_agent` ausente en `consent_records` para leads del formulario comercial (sí presente en el institucional)
- Dependencia invertida: `infrastructure/db/repositories/promocion.repository.ts` importa `features/promociones/services/TipologiaSyncService`
- No hay CAPTCHA en el formulario público (sólo rate limiting por IP)

---

## 2. Arquitectura

### Estado actual

El proyecto sigue la Scope Rule de `constitution.md` con coherencia alta:

```
app/
  (public)/    ← páginas SSR/ISR
  (auth)/      ← backoffice protegido
  api/
    v1/        ← API pública con autenticación API key
    internal/  ← endpoints internos del backoffice
src/
  shared/      ← componentes, constants, hooks, schemas transversales
  features/    ← lógica por bounded context
  infrastructure/ ← DB, auth, email, rate limiting, tenant, observability
```

Los tres contextos de tenant (`PublicContext`, `AuthenticatedContext`, `ApiKeyContext`) se resuelven en los límites correctos y se pasan por inyección. El middleware de Next.js protege `/panel/*` con `getToken` y aplica `X-Robots-Tag: noindex` en backoffice e internals.

El email se encola siempre en `email_queue` dentro de la misma transacción que el recurso principal, con un worker separado que consume la cola con reintentos exponenciales.

### Fortalezas

- Separación de responsabilidades entre capas efectiva y consistente
- Cursor pagination implementada correctamente en catálogo y API pública (sin OFFSET)
- Serialización de privacidad del mapa correcta en la API (`serializePromocion` filtra `location` si `AREA`)
- `sanitizeForClient` en `get-detail-data.ts` sobreescribe `location` con `locationApprox` en AREA antes de serializar al RSC payload
- `MediaImage` con fallback determinista; `alt` obligatorio en runtime
- Sentry wrapper con scrubbing de secrets y context de tenant

### Debilidades

- Una dependencia invertida: `infrastructure` importa de `features`
- La feature `favorites` viola el principio de diseño del producto (no hay favoritos persistentes en el MVP definido en `product.md §7`) y descarga el catálogo completo en cliente
- El formulario público (`ContactForm`) y el genérico (`ContactFormGeneric`) son implementaciones paralelas con schemas Zod distintos para el mismo concepto de "recoger datos de contacto"

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | `PromocionRepository` importa `TipologiaSyncService` de `features/` | `src/infrastructure/db/repositories/promocion.repository.ts` | Alto |
| A2 | Dos formularios de contacto paralelos con schemas distintos | `src/features/engagement/`, `src/features/contact/` | Medio |
| A3 | Feature `favorites` fuera del alcance del MVP y con patrón de carga ineficiente | `src/features/favorites/`, `app/(public)/favoritos/page.tsx` | Bajo |

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] `PromocionRepository` orquesta sincronización de tipologías
**Problema:** El repositorio de promociones instancia y ejecuta `TipologiaSyncService` dentro de su método `update()`. El repositorio tiene dos razones para cambiar: cambios en el acceso a datos de `promociones` y cambios en la lógica de sincronización de tipologías.
**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts` (línea 487)
**Impacto:** La extracción del servicio ya ocurrió (`TipologiaSyncService` existe), pero la llamada sigue dentro del repositorio. El efecto real es bajo porque `TipologiaSyncService` está bien encapsulado.
**Prioridad:** Posponer
**Acción concreta:** Mover la orquestación de `TipologiaSyncService.sync()` a una acción de servidor o un servicio de aplicación que llame tanto al repositorio como al sync service, en lugar de llamarlo desde dentro del repositorio.

---

### DIP — Dependency Inversion Principle

#### [DIP-01] `infrastructure` importa de `features` — dependencia invertida
**Problema:** `src/infrastructure/db/repositories/promocion.repository.ts` importa directamente `TipologiaSyncService` de `src/features/promociones/services/`. La infraestructura no debe depender de features; la dirección correcta es la inversa.
**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts:13`
**Impacto:** Si la feature `promociones` se renombra, mueve o divide, la infraestructura se rompe. La inversión de dependencia enturbia qué puede importar qué.
**Prioridad:** Planificar
**Acción concreta:** Mover `TipologiaSyncService` a `src/infrastructure/db/repositories/tipologia-sync.service.ts` o equivalente en infrastructure, o introducir una interfaz en `shared/strategies/`.

---

## 4. YAGNI

### Código innecesario

#### Feature `favorites` fuera de alcance MVP
`product.md §7` declara explícitamente: *"No hay favoritos persistentes de visitante (sin auth pública)"*. La feature existe, está en producción y añade:
- `src/features/favorites/useFavorites.ts`
- `src/features/favorites/FavoriteButton.tsx`
- `src/features/favorites/FavoritesView.tsx`
- `app/(public)/favoritos/page.tsx`

Esto no es un error crítico (la feature está en localStorage, sin datos de servidor, sin impacto en seguridad), pero es alcance que el propio `product.md` descarta.

**Prioridad:** Posponer (decisión de producto, no técnica)

### Código eliminable

| Código | Motivo | Riesgo de eliminar |
|--------|--------|--------------------|
| `src/features/favorites/` + `app/(public)/favoritos/page.tsx` | Fuera de alcance según `product.md §7` | Muy bajo |

---

## 5. KISS

### Complejidad accidental

#### Dos formularios de contacto con schemas propios

Existen dos implementaciones paralelas para capturar datos de contacto:

1. `src/features/engagement/components/ContactForm.tsx` + schema en `src/features/engagement/schemas/contact-form.schema.ts` — para contactar sobre una promoción específica.
2. `src/features/contact/components/ContactFormGeneric.tsx` + schema en `src/features/contact/actions/submit-contact.schema.ts` — para el formulario genérico de la página `/contacto`.

Los schemas son distintos: el de engagement recoge `phone`, `tipologiaId` y `consent`; el genérico solo `name`, `email`, `message`. La separación está justificada funcionalmente, pero los campos comunes (`name`, `email`, `message`) tienen reglas de validación distintas sin justificación aparente (engagement: `min(2)` en name; genérico: `min(1)`). Esto introduce inconsistencia visible para el usuario.

**Acción concreta:** Unificar las reglas de validación de los campos comunes (nombre, email, mensaje) en un schema base en `shared/schemas/` que ambos extiendan. No fusionar los formularios — son casos de uso distintos.

### Simplificaciones posibles

- `UpstashRateLimiter.consume()` es un alias de `increment()` (misma implementación). Eliminar `consume()` y llamar directamente a `increment()` desde los call sites, o documentar que son semánticamente distintos aunque la implementación sea la misma.

---

## 6. DRY

### Duplicaciones relevantes

#### Reglas de validación de campos de contacto inconsistentes

| Campo | `engagement/schemas/contact-form.schema.ts` | `contact/actions/submit-contact.schema.ts` |
|-------|---------------------------------------------|---------------------------------------------|
| name | `min(2)` | `min(1)` |
| email | `z.string().email()` | `z.string().email().max(255)` |
| message | `min(10)` | `min(1)`, `max(2000)` |

El `message` tiene `min(10)` en engagement pero `min(1)` en el genérico. Un usuario que ve "el mensaje debe tener al menos 10 caracteres" en la ficha pero no en /contacto percibirá inconsistencia. No es un bug funcional, pero viola la experiencia de usuario consistente.

**Acción concreta:** Extraer un `baseContactFieldsSchema` en `shared/schemas/contact.schema.ts` con reglas unificadas y razonadas. Cada formulario extiende con sus campos propios.

### Duplicaciones aceptables

- Los dos formularios de contacto (`ContactForm` y `ContactFormGeneric`) tienen código JSX similar pero diferente suficiente (campos distintos, acciones distintas, flujos distintos) para justificar existir separados.

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo | Severidad |
|---|-------|-----------|------|-----------|
| S1 | `as unknown as` en múltiples handlers de evento de componentes de backoffice | `src/features/promociones/components/blocks-editor.tsx:254-302`, `promocion-section-identity.tsx:110,153`, `promocion-section-commercial-status.tsx:199` | Primitive Obsession / type unsafety | Media |
| S2 | `as unknown as Record<string, unknown>` para pasar `initialData` a hooks | `src/features/promociones/components/promocion-form.tsx:163,193` | Type unsafety | Media |
| S3 | `catch {}` silencioso en `loadMediaAssets` | `app/(auth)/panel/catalogo/[id]/page.tsx:109` | Dead Code / Silent Error | Media |
| S4 | Literal de string duplicado `"Debes aceptar la política de privacidad"` entre schema Zod y texto del checkbox | `src/features/engagement/schemas/contact-form.schema.ts:30`, `src/features/engagement/components/ContactForm.tsx:283-293` | Magic String / DRY | Baja |
| S5 | `promocion-form.tsx` con 580 líneas orquestando múltiples secciones, estado, autosave, draft restore y validación | `src/features/promociones/components/promocion-form.tsx` | Long Method / God Component | Media |
| S6 | `lead.repository.ts` con 599 líneas combinando queries de lectura, escritura, exportación y notas | `src/infrastructure/db/repositories/lead.repository.ts` | God Class (repositorio) | Media |
| S7 | `favorites/useFavorites.ts` usa `window.localStorage` directamente sin util de abstracción | `src/features/favorites/useFavorites.ts` | Inappropriate Intimacy (con browser API) | Baja |

### Clasificación por severidad

- **Media:** S1, S2, S3, S5, S6
- **Baja:** S4, S7

### Prioridad

- **Planificar:** S3 (silencio en catch puede ocultar errores de media en producción), S5 (tamaño dificulta mantenimiento futuro del formulario)
- **Posponer:** S1, S2 (type casting en backoffice, bajo impacto), S6 (repositorio grande pero bien estructurado internamente)
- **No hacer:** S4, S7

---

## 8. Testing

### Estado

Infraestructura de tests bien establecida:
- Vitest con `pool: forks`, `singleFork: true`, `fileParallelism: false` (respeta §12 de constitution)
- Coverage con umbral 80 % en statements/branches/functions/lines
- Playwright para E2E con Page Object Model
- Tests de contrato de la API pública (`tests/contract/v1/`)
- Tests de aislamiento de tenant (`tests/isolation/`)
- Setup global en `tests/setup.ts`

### Calidad

**Puntos fuertes:**
- Tests de contrato validan que el schema de la API no cambia sin actualizar los snapshots
- Tests de aislamiento verifican que dos tenants no ven datos cruzados
- `ContactForm.spec.tsx` tiene cobertura de los flujos principales incluyendo el estado de carga y errores de campo
- `createLeadService` tiene tests unitarios con mock del contexto y transacción

**Puntos débiles:**

1. **`tests/isolation/` no verifica el aislamiento en `createLeadService`**: La función busca promociones por `eq(promociones.id, promocionId)` sin `eq(promociones.tenantId, ctx.getTenantId())`. El RLS de la BD lo cubre, pero no hay test explícito que verifique que un `promocionId` de un tenant B no puede usarse desde el contexto de un tenant A. En producción real (single-tenant) el riesgo es inexistente hoy; en producción multi-tenant sería crítico.

2. **`catch {}` silencioso en `loadMediaAssets`** (línea 109 del archivo de edición): Si la query de medios falla, el formulario carga sin imágenes sin indicación de error. No hay test que verifique este path de error.

3. **Coverage excluye páginas clave**: `app/layout.tsx`, `app/(public)/page.tsx`, `app/(auth)/layout.tsx` están excluidas del coverage. Los layouts pueden tener lógica relevante.

### Cobertura útil

Los tests de dominio (schema validation, lead creation, api key auth, rate limiting) cubren los paths críticos de negocio. Los tests de componentes cubren comportamiento observable. Los tests de integración (`tests/integration/`) usan bd real. El conjunto es robusto para la capa de negocio.

### Mejoras

| Mejora | Prioridad | Coste |
|--------|-----------|-------|
| Añadir test de aislamiento de tenant para `createLeadService`: verificar que un `promocionId` de tenant B no produce lead en tenant A | Alta | Bajo |
| Añadir test que cubra el path `catch {}` silencioso en `loadMediaAssets` | Media | Muy bajo |
| Añadir test de contrato que verifique que la respuesta de `GET /api/v1/promociones` con `AREA` no contiene `location` exacta | Alta | Bajo |

---

## 9. Seguridad

### [SEC-CRIT-01] `BlockDescripcion` — `dangerouslySetInnerHTML` sin sanitización de atributos de evento

**Criticidad:** High
**Archivo:** `src/features/detail/components/BlockDescripcion.tsx:32`
**Problema:** El componente renderiza HTML con `dangerouslySetInnerHTML`. La validación en `src/shared/types/content-block-schema.ts` (función `validateAllowedHtml`) solo verifica nombres de tag (`<b>`, `<strong>`, etc.) pero NO valida atributos. Un operador malicioso o un payload corrupto podría contener `<img onmouseover="...">` o `<a href="javascript:...">` y pasar la validación de tags sin ser bloqueado.

El vector requiere acceso al backoffice (rol OPERATOR o ADMIN), lo que limita el riesgo a insiders o cuentas comprometidas. No es explotable desde la web pública sin autenticación.

**Fix:** Extender `validateAllowedHtml` para también verificar atributos permitidos, o añadir una función de strip de atributos de evento. Alternativa más robusta: usar `DOMPurify` (isomorphic) en el servidor antes de persistir el payload, o aplicar `sanitizeHtml` (npm: `sanitize-html`) que permite lista blanca de tags Y atributos.

```typescript
// Ejemplo mínimo en content-block-schema.ts
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "width", "height"],
};

function validateAllowedAttrs(html: string): boolean {
  // parsear atributos y verificar contra ALLOWED_ATTRS
}
```

---

### [SEC-MAJOR-01] `createLeadService` — lookup de promoción sin filtro de `tenantId` en `WHERE`

**Criticidad:** Medium (High en escenario multi-tenant real)
**Archivo:** `src/features/engagement/server/create-lead-action.ts:97-105`
**Problema:** La query busca la promoción solo por `eq(promociones.id, promocionId)` sin añadir `eq(promociones.tenantId, ctx.getTenantId())` en el `WHERE` de Drizzle. En producción con Neon/PgBouncer, el RLS (`SET LOCAL app.current_tenant_id`) dentro de `withTransaction` protege correctamente. Sin embargo:

1. En tests de integración que mockean el contexto, el RLS puede no aplicar.
2. Si por cualquier motivo el `SET LOCAL` falla silenciosamente (por ej. si alguien llama a `tx.execute` directamente), la query retornaría la promoción de cualquier tenant.
3. No hay test de aislamiento que verifique este caso específico.

**Fix:** Añadir `eq(promociones.tenantId, ctx.getTenantId())` a la cláusula `where` como defensa en profundidad, independientemente de lo que haga el RLS. Coste: 1 línea. Beneficio: defensa en profundidad alineada con el patrón del resto del código (los repositorios siempre filtran explícitamente por `tenantId` además de confiar en RLS).

---

### [SEC-MAJOR-02] `consent_records` del formulario comercial no recoge `user_agent`

**Criticidad:** Medium (RGPD)
**Archivo:** `src/features/engagement/server/create-lead-action.ts:156-163`
**Problema:** La inserción en `consent_records` para leads creados desde el formulario web comercial (`createLeadService`) no recoge el `user_agent` del navegador del visitante. La tabla tiene el campo `user_agent` nullable, y el endpoint institucional (`create-institutional-lead.ts`) sí lo recoge. La omisión no viola la RGPD per se (el campo no es obligatorio por ley), pero reduce la trazabilidad del consentimiento frente a peticiones ARSOP o litigios.

**Fix:** Pasar el `User-Agent` header desde `createLeadAction` (que tiene acceso a `headers()`) hasta `createLeadService` como parámetro opcional, y usarlo en el `INSERT` de `consent_records`.

---

### [SEC-INFO-01] No hay CAPTCHA en el formulario público

**Criticidad:** Low
**Archivo:** `src/features/engagement/components/ContactForm.tsx`, `src/features/contact/components/ContactFormGeneric.tsx`
**Problema:** `product.md §8` menciona explícitamente: *"El formulario está protegido contra envíos automatizados (rate limiting + captcha)"*. El rate limiting está implementado (3 intentos/10 min/IP). El CAPTCHA no lo está.

El rate limiting por IP es derrotable con IPs rotativas. La ausencia de CAPTCHA expone los endpoints de creación de leads a spam automatizado que puede saturar `email_queue` y contaminar la bandeja de leads.

**Fix:** Integrar Cloudflare Turnstile (gratuito, accesible, sin degradar a11y) en ambos formularios. La verificación del token se hace en el server action antes de la creación del lead.

---

## 10. Performance

### [P-HIGH-01] `/favoritos` descarga hasta 100 promociones para filtrar en cliente

**Problema:** `app/(public)/favoritos/page.tsx` ejecuta `getCatalogData({ limit: 100, sort: "published" })` y serializa todo el catálogo al cliente. `FavoritesView` filtra los resultados por los IDs guardados en localStorage. Con 50+ promociones en el catálogo, esto envía una respuesta JSON innecesariamente grande para usuarios que pueden tener 0-5 favoritos.

**Archivos afectados:** `app/(public)/favoritos/page.tsx`, `src/features/favorites/FavoritesView.tsx`
**Fix recomendado:** Si se mantiene la feature, dos opciones:
1. Implementar un endpoint `/api/internal/promociones?ids=...` que solo retorne los IDs solicitados.
2. O bien eliminar la página server-side y convertirla en una página puramente client-side que haga un fetch con los IDs cuando tenga `ready === true` desde `useFavorites`.

Dado que `product.md §7` descarta los favoritos como no-objetivo del MVP, la opción más limpia es eliminar la feature.

---

### [P-MEDIUM-01] `getRelatedProperties` ejecuta dos subqueries correlacionadas por fila

**Problema:** La query de `get-related-properties.ts` (líneas 96-113) usa dos subqueries correlacionadas (`SELECT MIN(...)` por fila) para obtener precio mínimo y área mínima. Con un índice adecuado en `(promocion_id, tenant_id)` sobre `tipologias`, el impacto es bajo en catálogos pequeños, pero con N promociones relacionadas el costo crece linealmente.

**Archivos afectados:** `src/features/engagement/server/get-related-properties.ts:96-113`
**Fix recomendado:** Reescribir con un `LEFT JOIN (SELECT MIN(...) GROUP BY promocion_id)` como se hace correctamente en `catalog.repository.ts` método `fetchPublicWithPriceSort`. El patrón ya existe en el codebase; solo hay que replicarlo.

---

## 11. Deuda Técnica

### Crítica (bloquea corrección o RGPD)

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | `createLeadService`: añadir `tenantId` al `WHERE` de la query a `promociones` | 15 min |
| DT-02 | `BlockDescripcion`: sanitizar atributos de evento además de tags en `validateAllowedHtml` | 1-2h |
| DT-03 | `createLeadService`: pasar y registrar `user_agent` en `consent_records` | 30 min |

### Alta

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-04 | Añadir test de aislamiento de tenant para `createLeadService` | 1h |
| DT-05 | Mover `TipologiaSyncService` de `features/` a `infrastructure/` o mover la llamada a un servicio de aplicación | 2h |
| DT-06 | Unificar reglas de validación de campos comunes entre los dos schemas de contacto | 1h |
| DT-07 | `catch {}` silencioso en `loadMediaAssets`: loggear el error o propagar un estado de error visible | 30 min |

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-08 | `getRelatedProperties`: reemplazar subqueries correlacionadas por LEFT JOIN con GROUP BY | 1h |
| DT-09 | Añadir CAPTCHA (Cloudflare Turnstile) a formularios públicos | 3-4h |
| DT-10 | `BlockDescripcion`: evaluar si `dangerouslySetInnerHTML` puede reemplazarse con un renderer estructurado | 2h |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-11 | Eliminar o reclasificar `favorites` feature según decisión de producto | 30 min |
| DT-12 | Eliminar alias `consume()` = `increment()` en `UpstashRateLimiter` | 10 min |
| DT-13 | Reducir el tamaño de `promocion-form.tsx` (580 líneas) extrayendo la lógica de validación publicación a un hook | 2h |
| DT-14 | Añadir test de contrato explícito para modo `AREA` (verificar que `location` exacta no aparece en respuesta) | 1h |

---

## 12. Quick Wins

> Cambios < 2h, seguros de forma independiente, alto impacto.

### QW-01 — Filtro `tenantId` en `createLeadService` (~15 min)

```typescript
// src/features/engagement/server/create-lead-action.ts
const [promocion] = await tx
  .select({ id: promociones.id, name: promociones.name, assignedAgentId: promociones.assignedAgentId })
  .from(promociones)
  .where(
    and(
      eq(promociones.id, promocionId),
      eq(promociones.tenantId, ctx.getTenantId()), // ← añadir esta línea
    )
  )
  .limit(1);
```

---

### QW-02 — Registrar `user_agent` en `consent_records` del formulario comercial (~30 min)

En `createLeadAction` (`create-lead-action.ts`), extraer el `user-agent` del header y pasarlo a `createLeadService`. En la función de servicio, añadir `userAgent: userAgent ?? null` en el `INSERT` de `consentRecords`.

---

### QW-03 — Loggear errores en el `catch` silencioso de `loadMediaAssets` (~10 min)

```typescript
// app/(auth)/panel/catalogo/[id]/page.tsx
} catch (error) {
  logger.warn("loadMediaAssets failed", error instanceof Error ? error.message : String(error));
  // Non-blocking, continue with empty gallery
}
```

---

### QW-04 — Unificar validación mínima de campos comunes de contacto (~1h)

Crear `src/shared/schemas/contact-base.schema.ts`:
```typescript
export const contactBaseSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().email("Introduce un email válido").max(255),
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres").max(2000),
});
```
Ambos schemas de feature extienden con `.extend({...})` añadiendo sus campos propios.

---

## 13. Refactors Estratégicos

### R-01 — Mover `TipologiaSyncService` a `infrastructure`

**Valor:** Elimina la única dependencia invertida del proyecto (infrastructure → features). Permite que cualquier parte de la infraestructura pueda usar el sync service sin violar la arquitectura de capas.
**Separación propuesta:** Mover `src/features/promociones/services/tipologia-sync.service.ts` a `src/infrastructure/db/services/tipologia-sync.service.ts`. Actualizar el import en `promocion.repository.ts`.
**Coste:** 30 min. **Riesgo de regresión:** Muy bajo.

---

### R-02 — Sanitización robusta de HTML en `DESCRIPCION_GENERAL`

**Valor:** Elimina el riesgo de XSS por atributos de evento en HTML almacenado en BD, sin cambiar la experiencia del editor ni el renderizado.
**Propuesta:** En el schema Zod de `DESCRIPCION_GENERAL`, añadir un paso de sanitización (con `sanitize-html` o implementación propia de strip de atributos peligrosos) que se aplica server-side al guardar el bloque. El HTML ya validado (solo tags permitidos) pasa por un segundo filtro que elimina atributos no permitidos. El `BlockDescripcion` component no cambia.
**Coste:** 1-2h (incluyendo tests). **Riesgo de regresión:** Bajo (el contenido existente en BD puede requerir revisión si contiene atributos válidos como `href` en `<a>`).

---

### R-03 — Refactor de `getRelatedProperties` para eliminar subqueries correlacionadas

**Valor:** Mejor rendimiento a escala, alineación con el patrón ya usado en `catalog.repository.ts`.
**Separación propuesta:** Reemplazar las dos subqueries SQL correlacionadas (líneas 96-113 en `get-related-properties.ts`) con un `LEFT JOIN (SELECT MIN(...) GROUP BY promocion_id) price_agg` tal como se hace en `fetchPublicWithPriceSort`. El patrón ya existe en el codebase.
**Coste:** 1h. **Riesgo de regresión:** Bajo (cambio local con resultados equivalentes, test cubierto por `get-related-properties.spec.ts`).

---

## 14. Refactors NO recomendados

### No refactorizar: Separar `LeadRepository` en repositorios más pequeños

`lead.repository.ts` tiene 599 líneas y múltiples métodos, pero **todos** pertenecen al mismo dominio: el lead. Los métodos de notas (`leadNotes`), historial (`leadHistory`) y marcas de leído (`leadReadMarks`) son satélites del lead y se usan siempre en el mismo contexto. Separar en `LeadNoteRepository`, `LeadHistoryRepository`, `LeadReadMarkRepository` generaría 3 clases con una o dos operaciones cada una. El coste de abstracción superaría el beneficio.

### No refactorizar: Extraer `ContactForm` y `ContactFormGeneric` a un componente base

Los dos formularios de contacto comparten campos superficialmente pero tienen flujos, acciones de servidor, y contexto semántico completamente distintos (uno crea un lead asociado a una promoción con tipología y consentimiento RGPD; el otro notifica a un email genérico). Forzar un componente base común introduciría props condicionales y complejidad en lugar de reducirla. La solución correcta es unificar solo las reglas de validación (QW-04), no los componentes.

### No refactorizar: Reemplazar `unstable_cache` por otro mecanismo

La API de Next.js para ISR usa `unstable_cache` correctamente con `revalidateTag` para invalidación incremental. Aunque el nombre "unstable" incomoda, es la API canónica de Next.js 15 para este propósito y está en uso stábil. No hay alternativa superior disponible hoy en el ecosistema de App Router.

### No refactorizar: Abstraer `redis-client.ts` detrás de una interfaz

El cliente de Redis tiene una única implementación (Upstash) con degradación graceful. Añadir una interfaz `ICacheClient` solo para "prepararse para otro proveedor" es YAGNI puro. Si en el futuro se cambia de Upstash, el cambio está contenido en `redis-client.ts` y `rate-limiter.factory.ts`.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)

- [x] [DT-01 / QW-01] Añadir `eq(promociones.tenantId, ctx.getTenantId())` al WHERE de `createLeadService` — 15 min
- [x] [DT-03 / QW-02] Registrar `user_agent` en `consent_records` del formulario comercial — 30 min
- [x] [DT-07 / QW-03] Loggear error silenciado en `catch {}` de `loadMediaAssets` — 10 min
- [x] [DT-04] Añadir test de aislamiento de tenant para `createLeadService` — 1h

### Fase 2 — Corto plazo (próximo mes)

- [x] [DT-02 / R-02] Sanitizar atributos de evento en HTML de `DESCRIPCION_GENERAL` — 1-2h
- [x] [DT-06 / QW-04] Unificar reglas de validación de campos comunes de contacto — 1h
- [x] [R-01] Mover `TipologiaSyncService` a infrastructure — 30 min
- [x] [DT-08 / R-03] Refactor de `getRelatedProperties` con JOIN en lugar de subqueries — 1h
- [x] [DT-14] Test de contrato explícito para modo `AREA` — 1h

### Fase 3 — Medio plazo (próximo trimestre)

- [x] [DT-09] CAPTCHA (Cloudflare Turnstile) en formularios públicos — 3-4h
- [x] [DT-13] Reducir `promocion-form.tsx` extrayendo hook de validación de publicación — 2h
- [ ] [DT-11] Decisión de producto sobre feature `favorites` (eliminar o formalizar en product.md) — según decisión — **pendiente de decisión del usuario**

### No planificado

- `UpstashRateLimiter.consume()` alias — demasiado menor para planificar un sprint; fix en cualquier PR que toque el archivo
- Reducción de `LeadRepository` — no recomendado (ver §14)

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 8 | Sólida. Un caso de dependencia invertida, feature fuera de scope |
| Simplicidad | 7 | Bien en general; `promocion-form.tsx` grande, dos formularios paralelos |
| Mantenibilidad | 8 | Tests de dominio buenos, coverage razonable, convenciones consistentes |
| Cohesión | 8 | Bounded contexts bien definidos; `LeadRepository` largo pero cohesionado |
| Acoplamiento | 7 | Una inversión de dependencia infrastructure→features |
| Legibilidad | 9 | Código bien nombrado, comentarios donde añaden valor, sin magia |
| Calidad del diseño | 7 | Buena en 90% del código; casting `as unknown as` en backoffice |
| Testing | 8 | Cobertura robusta en dominio; falta el aislamiento de `createLeadService` |
| Seguridad | 6 | RLS correcto; XSS por atributos en HTML; CAPTCHA ausente; `user_agent` RGPD |
| Deuda técnica | 8 | Deuda baja y localizada; los 3 críticos tienen fixes triviales |
| **Total** | **76/100** | |

**Calificación:** B

**Justificación:** El proyecto está bien construido y en producción se comporta correctamente. Los 10 puntos que le faltan para llegar a A están distribuidos así: 3 puntos por las tres deudas de Fase 1 (todas < 1h cada una), 4 puntos por la ausencia de CAPTCHA y la sanitización incompleta de HTML, y 3 puntos por la dependencia invertida y los castings de tipo en el backoffice. Un sprint de dos días resolvería los 3 críticos y subiría el score a ~83 (B+).
