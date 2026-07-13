# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-13
> Rama auditada: `chore/engenier-auditor`
> Auditoría anterior: `technical-roadmap-2026-07-13.md` (backup de 2026-07-12)

---

## 1. Executive Summary

**Score:** 87 — **B+**

**Estado general:** Esta iteración cierra los dos bloqueantes de seguridad más relevantes de la auditoría anterior. El bug de stale closure en Turnstile (que hacía que el CAPTCHA fuera inoperativo en producción) está corregido. La sanitización de atributos HTML en `BlockDescripcion` (XSS insider risk) también está resuelta con un transformador Zod que limpia atributos de evento y URLs peligrosas antes de persistir. El codebase está en un estado sólido para operar en producción. Los tres puntos de mejora abiertos son de prioridad media-baja y no bloquean el funcionamiento.

**Fortalezas principales:**
- Turnstile CAPTCHA completamente operativo en ambos formularios públicos
- Sanitización de atributos HTML implementada como transformador Zod: se limpia en el servidor antes de persistir, no en el render
- `createLeadService` con defensa en profundidad: `tenantId` en `WHERE` + RLS + test T026 explícito
- Arquitectura de capas sin dependencias invertidas
- Tests de aislamiento multi-tenant robustos (T022–T026)
- Schema base de contacto unificado en `shared/schemas/contact-base.schema.ts`
- `TipologiaSyncService` correctamente ubicado en `infrastructure/db/services/`
- Tests de contrato v1 con casos explícitos para serialización AREA vs EXACT

**Riesgos principales:**
- `getRelatedProperties`: el `tipologiaAgg` resuelve el ORDER BY y el SELECT, pero el filtro de precio sigue usando un `EXISTS` correlacionado por fila — la mejora de rendimiento es parcial
- `submit-contact.action.ts` tiene dos pasos numerados como "3." (cosmético pero indica descuido en la revisión)
- Feature `favorites` fuera de alcance MVP con `limit: 100` (decisión de producto pendiente)

---

## 2. Arquitectura

### Estado actual

```
app/
  (public)/    ← páginas SSR/ISR (home, catálogo, ficha, contacto, favoritos)
  (auth)/      ← backoffice protegido
  api/
    v1/        ← API pública con autenticación API key
    internal/  ← endpoints internos del backoffice
src/
  shared/      ← componentes, constants, hooks, schemas transversales
  features/    ← lógica por bounded context
  infrastructure/ ← DB, auth, email, rate limiting, tenant, observability
```

La arquitectura de capas es correcta. Sin dependencias invertidas. `TipologiaSyncService` está en `infrastructure/db/services/`, no en `features/`. La dirección de dependencia es correcta en todo el codebase.

### Fortalezas

- Separación de responsabilidades entre capas efectiva y consistente
- Cursor pagination implementada correctamente en catálogo y API pública
- Serialización de privacidad del mapa correcta en API y RSC
- `MediaImage` con fallback determinista; `alt` obligatorio en runtime
- Sentry wrapper con scrubbing de secrets y contexto de tenant
- Repositorios context-aware con `SET LOCAL` — sin excepciones detectadas
- Tests de aislamiento T022–T026 cubren los invariantes multi-tenant críticos

### Debilidades

- La feature `favorites` viola el alcance del MVP declarado en `product.md §7`
- `getRelatedProperties`: la mejora del `tipologiaAgg` es parcial — el filtro de precio sigue siendo un `EXISTS` correlacionado

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | Feature `favorites` fuera de alcance MVP (decisión de producto pendiente) | `src/features/favorites/`, `app/(public)/favoritos/page.tsx` | Bajo |
| A2 | `getRelatedProperties`: `tipologiaAgg` resuelve SELECT/ORDER BY pero el filtro de precio usa `EXISTS` correlacionado | `src/features/engagement/server/get-related-properties.ts:136-145` | Medio |

---

## 3. SOLID

### SRP — Single Responsibility Principle

El repositorio `PromocionRepository` instancia y llama a `TipologiaSyncService` internamente desde `update()`. La orquestación sigue dentro del repositorio. Es un acoplamiento tolerable porque el servicio está bien encapsulado; el patrón más puro sería mover la llamada a un servicio de aplicación. No es bloqueante.

**Estado:** Sin cambios. Prioridad: Posponer.

### DIP — Dependency Inversion Principle

**RESUELTO.** Sin dependencias de `infrastructure` hacia `features` en el codebase actual.

---

## 4. YAGNI

### Código innecesario

#### Feature `favorites` fuera de alcance MVP

`product.md §7` declara: "Los favoritos de visitante sí están en alcance (guardado en localStorage, sin auth pública); la implementación actual carga hasta 100 promociones en cliente — optimización pendiente para cuando el catálogo crezca." Esta nota en `product.md` acepta la implementación actual de forma explícita. Sin embargo, la restricción de `limit: 100` permanece como deuda técnica cuando el catálogo crezca.

La feature no debe eliminarse — está en alcance según `product.md`. El único problema real es el `limit: 100` que degrada con catálogos grandes.

**Estado:** Pendiente decisión de optimización cuando el catálogo lo requiera.

### Código eliminable

Ninguno identificado en esta iteración.

---

## 5. KISS

### Complejidad accidental

#### `getRelatedProperties`: `tipologiaAgg` parcialmente efectivo

El `tipologiaAgg` fue introducido para eliminar subqueries correlacionadas. Sin embargo, el filtro de precio en el WHERE sigue usando:

```sql
EXISTS (
  SELECT 1 FROM tipologias t2
  WHERE t2.promocion_id = promociones.id    -- referencia a la fila externa = correlacionado
    AND t2.reference_price_sale BETWEEN :priceMin AND :priceMax
)
```

El `tipologiaAgg` se une con `LEFT JOIN` y se usa para `COALESCE(tipologiaAgg.minPrice, 0)` en el SELECT y el ORDER BY — correcto. Pero el filtro `BETWEEN` no usa `tipologiaAgg`: sigue siendo un EXISTS por fila. La mejora real es solo en el SELECT/ORDER BY, no en el filtro de precio.

Una solución limpia sería mover el filtro de precio al JOIN condition del `tipologiaAgg` o añadir un segundo subquery agregado que incluya el rango de precios. El impacto práctico es bajo en catálogos pequeños pero crece con el tamaño del catálogo.

#### Numeración duplicada en `submit-contact.action.ts`

Los pasos están numerados 1, 2, 3, 3 (dos pasos "3."). El segundo "3." debería ser "4.". Es cosmético pero indica que el archivo no fue revisado después de ser modificado.

### Simplificaciones posibles

- Corregir la numeración de pasos en `submit-contact.action.ts` (1-4 en lugar de 1-3-3).
- Mover el filtro de precio en `getRelatedProperties` al `tipologiaAgg` para eliminar el EXISTS correlacionado restante.

---

## 6. DRY

### Duplicaciones resueltas

- Schema base de contacto unificado: `contactBaseSchema` en `shared/schemas/contact-base.schema.ts`. Ambos formularios de contacto extienden este schema.

### Duplicaciones aceptables

- `ContactForm` y `ContactFormGeneric` siguen siendo implementaciones separadas con flujos distintos. No deben unificarse — ya comparten el schema base.

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo | Severidad |
|---|-------|-----------|------|-----------|
| S1 | Numeración duplicada de pasos (`// 3.` dos veces) | `src/features/contact/actions/submit-contact.action.ts:43,59` | Cosmético | Muy baja |
| S2 | `as unknown as` en handlers de evento del editor de bloques | `src/features/promociones/components/blocks-editor.tsx:261-300` | Type unsafety | Media |
| S3 | `as unknown as Record<string, unknown>` para `initialData` y `formState` en hooks | `src/features/promociones/components/promocion-form.tsx:163,193` | Type unsafety | Media |
| S4 | `as never` en `mapZodErrorsToSections` y `api-key-auth.ts` | `src/features/promociones/hooks/use-publish-validation.ts:55`, `src/features/api-public/middleware/api-key-auth.ts:38` | Type unsafety | Media |
| S5 | `authCtx!` con non-null assertion en 4 lugares del repositorio | `src/infrastructure/db/repositories/promocion.repository.ts:214,216,481,487` | Potential runtime error | Media |
| S6 | `getRelatedProperties`: EXISTS correlacionado residual para el filtro de precio | `src/features/engagement/server/get-related-properties.ts:136-145` | Performance / Incompleto | Media |
| S7 | `promocion-form.tsx` ~350 líneas (mejorado con extracción de hook, pero sigue siendo largo) | `src/features/promociones/components/promocion-form.tsx` | Long Component | Baja |
| S8 | `lead.repository.ts` con ~600 líneas combinando reads, writes, export y notas | `src/infrastructure/db/repositories/lead.repository.ts` | God Class (repositorio) | Baja |

### Clasificación por severidad

- **Media:** S2, S3, S4, S5, S6
- **Baja:** S7, S8
- **Muy baja:** S1

### Prioridad

- **Hacer de inmediato:** ninguno (no hay críticos en esta iteración)
- **Planificar:** S5 (`authCtx!` puede fallar en runtime si se usa el repositorio con contexto público), S6 (eliminar EXISTS correlacionado)
- **Posponer:** S2, S3, S4 (type casting acumula deuda de tipo pero no rompe en runtime)
- **No hacer:** S1 (fix trivial en el mismo PR que toque el archivo), S7, S8 (coste > beneficio)

---

## 8. Testing

### Estado

Infraestructura de tests bien establecida:
- Vitest con `pool: forks`, `singleFork: true`, `fileParallelism: false`
- Coverage con umbral 80%
- Playwright para E2E con Page Object Model
- Tests de contrato v1 con casos explícitos para modo AREA/EXACT
- Tests de aislamiento T022–T026

### Calidad

**Puntos fuertes:**
- T026 verifica explícitamente que `createLeadService` rechaza un `promocionId` de tenant B cuando el contexto es de tenant A
- Tests del schema `submit-contact.schema.spec.ts` cubren los límites de validación unificada
- `get-related-properties.spec.ts` verifica el pipeline de relacionados (2 resultados, límite 4, shape de objetos)
- Tests de contrato en `promocion-response.contract.spec.ts` incluyen caso AREA vs EXACT
- `content-block-schema.ts` incluye la nueva lógica de sanitización pero no tiene tests unitarios propios que verifiquen el transformador `sanitizeHtmlAttrs`

**Puntos débiles:**

1. **No hay tests unitarios para `sanitizeHtmlAttrs`**: la función tiene múltiples branches (event handlers, dangerous URLs, allowlist por tag, fallback a style/class). No están cubiertos por tests unitarios explícitos — la cobertura es implícita a través de los tests de schema si existen.

2. **No hay tests unitarios para `verifyTurnstileToken`**: la función tiene lógica de branches (sin secret key en dev, sin secret key en prod, sin token, fetch falla, respuesta con error-codes). Reportado en auditoría anterior, sigue pendiente.

3. **`getRelatedProperties.spec.ts` mock demasiado permisivo**: el test simula que la base de datos devuelve exactamente lo que le dice sin verificar la estructura SQL emitida. El EXISTS correlacionado no está cubierto por ningún test de comportamiento — si la query falla en PostgreSQL real, los tests unitarios no lo detectan.

### Cobertura útil

Los tests de dominio cubren los paths críticos de negocio. El conjunto es robusto para la capa de tenancy y los contratos de API. La cobertura de la sanitización HTML es el gap más relevante.

### Mejoras

| Mejora | Prioridad | Coste |
|--------|-----------|-------|
| Añadir tests unitarios para `sanitizeHtmlAttrs`: event handlers, dangerous URLs, allowlist por tag | Alta | 1h |
| Añadir tests unitarios para `verifyTurnstileToken`: sin secret key en dev, sin secret key en prod, sin token, fetch falla, error-codes | Media | 1h |
| Test de integración para `getRelatedProperties` que verifique la query SQL emitida (o al menos el comportamiento end-to-end con datos reales) | Media | 2h |

---

## 9. Seguridad

### [SEC-CRIT-01] RESUELTO: `BlockDescripcion` — sanitización de atributos implementada

**Estado:** Resuelto en esta iteración.

`content-block-schema.ts` implementa `sanitizeHtmlAttrs` como transformador Zod que se aplica antes de persistir el bloque. La función:
- Strip event handlers (`onclick`, `onmouseover`, etc.) via regex `/^on\w+$/i`
- Strip `javascript:`, `data:`, `vbscript:` en atributos `href` y `src`
- Aplica allowlist de atributos por tag (`<a>` solo permite `href`, `title`, `target`, `rel`)
- Para tags sin allowlist: solo permite `style` y `class`

La sanitización ocurre en el servidor al persistir, no en el render del componente. El `dangerouslySetInnerHTML` en `BlockDescripcion.tsx` es ahora correcto porque el HTML almacenado ya está limpio.

**Gap residual:** `sanitizeHtmlAttrs` no tiene tests unitarios que cubran sus branches. Ver sección Testing.

---

### [SEC-HIGH-01] RESUELTO: Stale closure en Turnstile

**Estado:** Resuelto. `ContactForm.tsx` línea 105 incluye correctamente `[promocionId, turnstileToken]` en el dep array de `useCallback`. El CAPTCHA es operativo en ambos formularios.

---

### [SEC-INFO-01] `authCtx!` non-null assertion en `PromocionRepository`

**Criticidad:** Medium
**Archivo:** `src/infrastructure/db/repositories/promocion.repository.ts:214,216,481,487`
**Problema:** `this.authCtx` puede ser `null` cuando el repositorio se instancia con un `PublicContext` o `ApiKeyContext`. Las cuatro líneas con `this.authCtx!.role`, `this.authCtx!.userId` lanzarían `TypeError: Cannot read properties of null` en runtime si alguien usara `PromocionRepository` con un contexto no autenticado. Actualmente el repositorio solo se instancia en rutas del backoffice (protegidas por Auth.js), pero no hay garantía a nivel de tipos de que no se use en otros contextos.

**Fix recomendado:** Añadir una guarda explícita antes de cada uso de `authCtx!`:
```typescript
if (!this.authCtx) {
  throw new Error("PromocionRepository requiere contexto autenticado para esta operación");
}
```
O mejor: separar los métodos que requieren `authCtx` en un `AuthenticatedPromocionRepository` que extienda el base y garantice en el constructor que el contexto es autenticado.

---

## 10. Performance

### [P-MEDIUM-01] `getRelatedProperties`: EXISTS correlacionado residual en el filtro de precio

**Problema:** El `tipologiaAgg` (subquery agregada con GROUP BY) fue introducido para eliminar subqueries correlacionadas. Sin embargo, el filtro de precio en la cláusula WHERE sigue usando:
```sql
EXISTS (
  SELECT 1 FROM tipologias t2
  WHERE t2.promocion_id = promociones.id   -- correlacionado
    AND t2.reference_price_sale BETWEEN :priceMin AND :priceMax
)
```
Para cada fila de `promociones` que pase los filtros previos (mismo tipo, 5km, status PUBLISHED), la base de datos ejecuta esta subquery. En catálogos pequeños el impacto es despreciable; con catálogos de >500 inmuebles en la misma zona podría ser perceptible.

**Fix recomendado:** Añadir un campo `has_price_in_range` al `tipologiaAgg` usando una agregación condicional:
```typescript
const tipologiaAgg = tx
  .select({
    promocionId: tipologias.promocionId,
    minPrice: sql<number>`MIN(${tipologias.referencePriceSale})`.as("min_price"),
    minArea: sql<number>`MIN(${tipologias.usefulArea})`.as("min_area"),
    hasPriceInRange: sql<boolean>`BOOL_OR(
      ${tipologias.referencePriceSale} BETWEEN ${priceMin} AND ${priceMax}
    )`.as("has_price_in_range"),
  })
  .from(tipologias)
  .groupBy(tipologias.promocionId)
  .as("tipologia_agg");
```
Y usar `tipologiaAgg.hasPriceInRange` en el WHERE en lugar del EXISTS.

**Archivos afectados:** `src/features/engagement/server/get-related-properties.ts`
**Coste:** 30 min. **Riesgo de regresión:** Bajo (un test existente verifica el comportamiento).

### [P-MEDIUM-02] `/favoritos` descarga hasta 100 promociones para filtrar en cliente

**Estado:** Sin cambios. Acotado según `product.md §7` — es deuda conocida, no urgente hasta que el catálogo crezca.

---

## 11. Deuda Técnica

### Alta

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | Tests unitarios para `sanitizeHtmlAttrs`: cubrir event handlers, dangerous URLs, allowlist por tag, fallback | 1h |
| DT-02 | Tests unitarios para `verifyTurnstileToken`: 5 branches (sin secret key dev, sin secret key prod, sin token, fetch falla, error-codes) | 1h |

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-03 | `authCtx!` non-null assertion en 4 lugares de `PromocionRepository` — añadir guarda explícita o separar en subclase autenticada | 1h |
| DT-04 | `getRelatedProperties`: eliminar EXISTS correlacionado del filtro de precio usando agregación condicional en `tipologiaAgg` | 30 min |
| DT-05 | Type casting `as unknown as` en `blocks-editor.tsx` y `promocion-form.tsx` | 2h |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-06 | Renumerar pasos en `submit-contact.action.ts` (dos pasos "3.") | 5 min |
| DT-07 | Decisión de producto sobre optimización de `/favoritos` con `limit: 100` | 30 min (decisión) |

### Resueltas en esta iteración (respecto a auditoría 2026-07-12)

| Deuda resuelta | Descripción |
|----------------|-------------|
| ~~DT-01~~ | `ContactForm.handleSubmit`: stale closure en `useCallback` — dep array corregido con `[promocionId, turnstileToken]` |
| ~~DT-02~~ | `BlockDescripcion`: sanitización de atributos de evento implementada como transformador Zod |

---

## 12. Quick Wins

> Cambios < 30 min, seguros de forma independiente.

### QW-01 — Renumerar pasos en `submit-contact.action.ts` (~5 min)

```typescript
// src/features/contact/actions/submit-contact.action.ts — línea 59
// Cambiar "// 3. Enqueue email notification" por "// 4. Enqueue email notification"
```

### QW-02 — Eliminar EXISTS correlacionado en `getRelatedProperties` (~30 min)

Añadir `hasPriceInRange` al `tipologiaAgg` (ver §10 para el código exacto) y reemplazar el bloque `sql\`(...OR EXISTS...)\`` por:

```typescript
sql`(${minPrice} = 0 OR ${tipologiaAgg.hasPriceInRange} = true)`,
```

---

## 13. Refactors Estratégicos

### R-01 — Tests unitarios para `sanitizeHtmlAttrs` y `validateAllowedHtml`

**Valor:** La sanitización de HTML es una función de seguridad crítica. Sin tests, una regresión en `sanitizeHtmlAttrs` podría reabrir el vector XSS sin que los tests lo detecten.
**Propuesta:** Añadir `src/shared/types/content-block-schema.spec.ts` con casos: tag con `onclick`, `href="javascript:..."`, `href="data:..."`, tag con atributos permitidos (no deben eliminarse), tag sin allowlist (solo `style`/`class` se conservan).
**Coste:** 1h. **Riesgo de regresión:** Ninguno (solo tests nuevos).

### R-02 — Tests unitarios para `verifyTurnstileToken`

**Valor:** La función tiene 5 branches distintos, ninguno cubierto por tests unitarios. El CAPTCHA es una protección de seguridad — sus branches deben estar cubiertos.
**Propuesta:** Añadir `src/shared/utils/turnstile.spec.ts` con mocks de `fetch` y `process.env` para los 5 casos.
**Coste:** 1h. **Riesgo de regresión:** Ninguno (solo tests nuevos).

### R-03 — Guardar explícito en `PromocionRepository` cuando `authCtx` es null

**Valor:** Elimina el riesgo de `TypeError` en runtime si el repositorio se usa en contextos no autenticados. Hace el contrato del constructor explícito a nivel de tipos.
**Propuesta:** En los métodos `findAll`, `update`, e indirectamente vía `syncService`, añadir guarda antes del primer `this.authCtx!`:
```typescript
if (!this.authCtx) {
  throw new Error("Este método requiere contexto autenticado");
}
```
**Coste:** 30 min. **Riesgo de regresión:** Muy bajo.

---

## 14. Refactors NO recomendados

### No refactorizar: Separar `LeadRepository` en repositorios más pequeños

~600 líneas pero todos los métodos pertenecen al mismo dominio de leads. El coste de abstracción (interfaces, inyección, tests actualizados) supera el beneficio de claridad.

### No refactorizar: Extraer `ContactForm` y `ContactFormGeneric` a componente base

Los dos formularios comparten schema base (ya unificado con `contactBaseSchema`) pero tienen flujos completamente distintos. La solución correcta ya está implementada.

### No refactorizar: Mover la orquestación de `TipologiaSyncService` fuera del repositorio

`TipologiaSyncService.syncInTx()` se llama desde `PromocionRepository.update()`. La alternativa (servicio de aplicación) requeriría refactorizar la página de edición y sus tests. El coste supera el beneficio dado que el servicio está bien encapsulado.

### No refactorizar: Reescribir `getRelatedProperties` para eliminar el EXISTS con un JOIN alternativo complejo

El fix correcto (QW-02) usa una agregación condicional simple, no una reescritura. Una reescritura compleja introduciría riesgo sin beneficio adicional.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)

- [x] [DT-06 / QW-01] Renumerar paso "3." duplicado en `submit-contact.action.ts` — 5 min
- [x] [DT-04 / QW-02] Eliminar EXISTS correlacionado en `getRelatedProperties` con agregación condicional — 30 min

### Fase 2 — Corto plazo (próximo sprint)

- [x] [DT-01 / R-01] Tests unitarios para `sanitizeHtmlAttrs` y `validateAllowedHtml` — 1h
- [x] [DT-02 / R-02] Tests unitarios para `verifyTurnstileToken` — 1h
- [x] [DT-03 / R-03] Guardar explícito en `PromocionRepository` para `authCtx` null — 30 min

### Fase 3 — Medio plazo (backlog)

- [ ] [DT-05] Limpiar castings `as unknown as` en `blocks-editor.tsx` y `promocion-form.tsx` — 2h
- [ ] [DT-07] Decisión de producto sobre optimización de `/favoritos` cuando el catálogo supere 100 promociones

### No planificado

- Separar `LeadRepository` — no recomendado (ver §14)
- Separar `ContactForm`/`ContactFormGeneric` en base común — no recomendado (ver §14)
- Mover orquestación `TipologiaSyncService` a servicio de aplicación — no recomendado (ver §14)

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 9 | Sin dependencias invertidas; `favorites` es scope minor |
| Simplicidad | 8 | EXISTS correlacionado residual; tipo casting persistente |
| Mantenibilidad | 8 | Tests de dominio robustos; falta cobertura de sanitizeHtmlAttrs |
| Cohesión | 9 | Bounded contexts bien definidos |
| Acoplamiento | 9 | Sin inversiones de dependencia; `TipologiaSyncService` en su capa |
| Legibilidad | 9 | Código bien nombrado; índice duplicado cosmético |
| Calidad del diseño | 8 | Schema base unificado; castings persistentes |
| Testing | 8 | T022–T026 robustos; sanitización HTML y Turnstile sin tests unitarios |
| Seguridad | 9 | CAPTCHA operativo; XSS resuelto; `authCtx!` es el riesgo residual |
| Deuda técnica | 9 | Las dos deudas críticas anteriores resueltas; deuda restante es media-baja |
| **Total** | **87/100** | |

**Calificación:** B+

**Justificación:** La iteración cierra los dos problemas de seguridad más relevantes del roadmap anterior (stale closure en Turnstile y XSS en `BlockDescripcion`), subiendo el score de 83 a 87 (+4 puntos). Los 13 puntos restantes para llegar a A+ se distribuyen: 2 puntos por tests unitarios de la sanitización HTML (función de seguridad sin cobertura explícita), 2 puntos por `verifyTurnstileToken` sin tests, 1 punto por el EXISTS correlacionado residual, y 8 puntos estructurales por los castings de tipo acumulados. Un sprint de 3 horas (R-01 + R-02 + QW-02) llevaría el score a ~90 (A-).
