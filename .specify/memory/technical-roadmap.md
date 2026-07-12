# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-12
> Rama auditada: `chore/engenier-auditor`
> Auditoría anterior: `technical-roadmap-2026-07-12-fix-design-params.md` (rama `fix/design-params`)

---

## 1. Executive Summary

**Score:** 84 — **B+**

**Estado general:** Esta rama cierra cinco de las siete deudas clasificadas como "Crítica" o "Alta" en la auditoría anterior. Las tres deudas críticas de Fase 1 están resueltas: el filtro `tenantId` en `createLeadService`, el registro de `user_agent` en `consent_records`, y el catch silencioso en `loadMediaAssets`. La dependencia invertida `infrastructure → features` se ha eliminado moviendo `TipologiaSyncService` a `infrastructure/db/services/`. El CAPTCHA (Cloudflare Turnstile) está implementado en ambos formularios públicos y el sistema de verificación server-side es correcto. La unificación de schemas de contacto está hecha con `shared/schemas/contact-base.schema.ts`. El refactor de `getRelatedProperties` para eliminar subqueries correlacionadas ya estaba implementado en el código (LEFT JOIN con GROUP BY subquery como `tipologiaAgg`). El test de aislamiento T026 verifica explícitamente que `createLeadService` rechaza un `promocionId` de otro tenant.

Quedan tres problemas nuevos introducidos en esta rama que merecen atención, más los dos que permanecían pendientes.

**Fortalezas principales:**
- Arquitectura de capas limpia y sin dependencias invertidas tras mover `TipologiaSyncService`
- CAPTCHA Turnstile implementado con degradación graceful (fallo silencioso en dev, error claro en prod sin secret key)
- `createLeadService` con defensa en profundidad: `tenantId` en `WHERE` + RLS
- Test de aislamiento T026 verifica el caso específico del cross-tenant `createLeadService`
- Schema base de contacto unificado con reglas consistentes en ambos formularios
- `getRelatedProperties` ya usa LEFT JOIN con subquery agregada (no correlated subqueries)
- `use-publish-validation` correctamente extraído a hook separado (reduce `promocion-form.tsx`)

**Riesgos principales:**
- `handleSubmit` en `ContactForm.tsx` cierra sobre `turnstileToken` pero no lo incluye en el dep array de `useCallback` — stale closure: el token siempre será el valor del primer render cuando se llama al submit
- `submit-contact.action.ts` tiene dos pasos numerados como "2." (el rate limit y el parse/validate) — error de índice menor pero que indica un copy-paste
- La feature `favorites` sigue presente y sigue con `limit: 100` (pendiente decisión de producto)
- `BlockDescripcion.dangerouslySetInnerHTML` sigue sin sanitización de atributos de evento (pendiente de la auditoría anterior, no abordado en esta rama)

---

## 2. Arquitectura

### Estado actual

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

La dependencia invertida infrastructure → features que existía en la auditoría anterior ha sido eliminada. `TipologiaSyncService` ahora vive en `src/infrastructure/db/services/tipologia-sync.service.ts` y `promocion.repository.ts` lo importa desde `@/infrastructure/db/services/tipologia-sync.service`. La dirección de dependencia es ahora correcta en toda la base de código.

### Fortalezas

- Separación de responsabilidades entre capas efectiva y consistente
- Cursor pagination implementada correctamente en catálogo y API pública
- Serialización de privacidad del mapa correcta en API y RSC
- `MediaImage` con fallback determinista; `alt` obligatorio en runtime
- Sentry wrapper con scrubbing de secrets y contexto de tenant
- `TipologiaSyncService` correctamente ubicado en infrastructure

### Debilidades

- La feature `favorites` viola el alcance del MVP declarado en `product.md §7` y sigue cargando el catálogo completo en cliente
- `ContactForm.tsx` tiene un stale closure en `handleSubmit`: `turnstileToken` no está en el dep array de `useCallback`

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | Stale closure en `handleSubmit`: `turnstileToken` leído en closure pero no en deps | `src/features/engagement/components/ContactForm.tsx:54-106` | Alto |
| A2 | Feature `favorites` fuera de alcance MVP con carga ineficiente (decisión de producto pendiente) | `src/features/favorites/`, `app/(public)/favoritos/page.tsx` | Bajo |

---

## 3. SOLID

### SRP — Single Responsibility Principle

La SRP-01 de la auditoría anterior (orquestación de `TipologiaSyncService` dentro del repositorio) sigue presente en la arquitectura. El servicio existe en infrastructure pero la llamada sigue dentro de `PromocionRepository.update()`. Es un acoplamiento tolerable dado que el servicio está bien encapsulado y la decisión fue posponer extraer la orquestación a un servicio de aplicación.

**Estado:** Sin cambios respecto a auditoría anterior. Prioridad: Posponer.

### DIP — Dependency Inversion Principle

**[DIP-01] RESUELTO.** `TipologiaSyncService` movido a `src/infrastructure/db/services/tipologia-sync.service.ts`. La importación en `promocion.repository.ts` línea 13 apunta ahora a `@/infrastructure/db/services/tipologia-sync.service`. No hay dependencias de infrastructure hacia features en el codebase.

---

## 4. YAGNI

### Código innecesario

#### Feature `favorites` fuera de alcance MVP

`product.md §7` declara explícitamente que no hay favoritos persistentes de visitante. La feature existe en localStorage sin impacto en seguridad. La decisión es de producto.

**Estado:** Sin cambios. Pendiente decisión del usuario.

### Código eliminable

| Código | Motivo | Riesgo de eliminar |
|--------|--------|--------------------|
| `src/features/favorites/` + `app/(public)/favoritos/page.tsx` | Fuera de alcance según `product.md §7` | Muy bajo |

---

## 5. KISS

### Complejidad accidental

#### Stale closure en `ContactForm.handleSubmit`

`handleSubmit` está envuelto en `useCallback` con dep array `[promocionId]`. Sin embargo, dentro del callback se lee `turnstileToken` del estado local. Cuando el usuario resuelve el widget de Turnstile, `turnstileToken` cambia, pero `handleSubmit` no se recrea porque `turnstileToken` no está en el dep array. El submit usará siempre el valor de `turnstileToken` del primer render (`null`), lo que hará que la verificación Turnstile siempre falle con `"Debes completar la verificación de seguridad."` a menos que el usuario recargue.

**Acción concreta:** Añadir `turnstileToken` al dep array de `useCallback`:
```typescript
[promocionId, turnstileToken]
```

O bien, si se quiere evitar recrear el callback, usar `useRef` para `turnstileToken` y leer `.current` dentro del callback.

#### Índice duplicado en `submit-contact.action.ts`

El archivo tiene dos bloques comentados como `// 2.` (líneas 34 y 43). El rate limit es `// 2.` y el parse/validate también es `// 2.`. El parse debería ser `// 3.`. Error cosmético menor pero indica un copy-paste no revisado.

### Simplificaciones posibles

- Renumerar los comentarios de pasos en `submit-contact.action.ts` para que sean consecutivos (1-4).

---

## 6. DRY

### Duplicaciones resueltas en esta rama

#### Schema base de contacto unificado — RESUELTO

`src/shared/schemas/contact-base.schema.ts` existe con reglas unificadas:
- `name`: `min(2)`, `max(100)`
- `email`: `z.string().email()`, `max(255)`
- `message`: `min(10)`, `max(2000)`

Ambos schemas (`engagement/schemas/contact-form.schema.ts` y `contact/actions/submit-contact.schema.ts`) extienden de `contactBaseSchema`. La inconsistencia de validación del formulario reportada en la auditoría anterior está resuelta.

### Duplicaciones aceptables

- Los dos formularios de contacto (`ContactForm` y `ContactFormGeneric`) siguen siendo implementaciones separadas con flujos distintos. Correcto: no deben unificarse.

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo | Severidad |
|---|-------|-----------|------|-----------|
| S1 | Stale closure: `turnstileToken` en `useCallback` sin incluir en deps | `src/features/engagement/components/ContactForm.tsx:106` | Logic Error / Stale Closure | Alta |
| S2 | Numeración duplicada de pasos (`// 2.` dos veces) | `src/features/contact/actions/submit-contact.action.ts:34,43` | Magic String / Cosmético | Muy baja |
| S3 | `as unknown as` en handlers de evento de backoffice | `src/features/promociones/components/blocks-editor.tsx`, `promocion-section-identity.tsx`, `promocion-section-commercial-status.tsx` | Type unsafety | Media |
| S4 | `as unknown as Record<string, unknown>` para `initialData` a hooks | `src/features/promociones/components/promocion-form.tsx:163` | Type unsafety | Media |
| S5 | `promocion-form.tsx` todavía ~350+ líneas aunque ha mejorado con extracción de hook | `src/features/promociones/components/promocion-form.tsx` | Long Method (reducido) | Baja |
| S6 | `lead.repository.ts` con 599 líneas combinando reads, writes, export y notas | `src/infrastructure/db/repositories/lead.repository.ts` | God Class (repositorio) | Media |

### Clasificación por severidad

- **Alta:** S1 (bug real: el token Turnstile nunca se envía)
- **Media:** S3, S4, S6
- **Baja:** S5
- **Muy baja:** S2

### Prioridad

- **Hacer de inmediato:** S1 (el CAPTCHA está implementado pero no funciona por este bug)
- **Planificar:** S3 (type casting acumula deuda de tipo)
- **Posponer:** S4, S6
- **No hacer:** S2 (fix trivial en el mismo PR que toque el archivo), S5 (ya mejorado con extracción de hook)

---

## 8. Testing

### Estado

Infraestructura de tests bien establecida (sin cambios respecto a auditoría anterior):
- Vitest con `pool: forks`, `singleFork: true`, `fileParallelism: false`
- Coverage con umbral 80%
- Playwright para E2E con Page Object Model
- Tests de contrato v1 con casos explícitos para modo AREA
- Tests de aislamiento incluyendo T026 (nuevo en esta rama)

### Calidad

**Puntos fuertes nuevos en esta rama:**
- T026 verifica explícitamente que `createLeadService` rechaza un `promocionId` de tenant B cuando el contexto es de tenant A
- Tests del schema `submit-contact.schema.spec.ts` cubren los límites de la validación unificada (min/max name, email, message)
- `get-related-properties.spec.ts` actualizado para el nuevo patrón con `tipologiaAgg` subquery, verificando 2 results, limit 4, shape de objetos retornados
- Tests de contrato en `promocion-response.contract.spec.ts` incluyen caso explícito para serialización AREA vs EXACT

**Puntos débiles restantes:**

1. **`ContactForm.spec.tsx` no prueba la integración con Turnstile**: los tests existentes no verifican que el token se pase correctamente al action. El stale closure (S1) no está cubierto por ningún test.

2. **`ContactFormGeneric.spec.tsx` no prueba la integración con Turnstile**: el mock del server action acepta sin verificar que `formData.get("turnstileToken")` sea no-nulo.

3. **No hay test unitario para `verifyTurnstileToken`**: la función tiene lógica de branches (sin secret key en dev, sin token, fetch falla, response con error-codes). Solo tres de estos cuatro branches tienen cobertura implícita.

### Cobertura útil

Los tests de dominio cubren los paths críticos de negocio. El conjunto es robusto para la capa de tenancy y los contratos de API. La cobertura de Turnstile es incompleta dado que la integración acaba de introducirse.

### Mejoras

| Mejora | Prioridad | Coste |
|--------|-----------|-------|
| Añadir `turnstileToken` al dep array de `useCallback` en `ContactForm` y añadir test que verifique que el token se pasa | Alta | 30 min |
| Añadir tests unitarios para `verifyTurnstileToken` cubriendo: sin secret key, sin token, fetch falla, respuesta con error-codes | Media | 1h |
| Añadir test de `ContactFormGeneric` que verifique que `turnstileToken` se incluye en FormData antes del submit | Media | 30 min |

---

## 9. Seguridad

### [SEC-CRIT-01] `BlockDescripcion` — `dangerouslySetInnerHTML` sin sanitización de atributos de evento

**Criticidad:** High
**Archivo:** `src/features/detail/components/BlockDescripcion.tsx:32`, `src/shared/types/content-block-schema.ts`
**Estado:** Pendiente. No abordado en esta rama.
**Problema:** `validateAllowedHtml` solo verifica nombres de tag pero no atributos. Un operador con acceso al backoffice podría guardar `<img onmouseover="...">` o `<a href="javascript:...">` que pasaría la validación de tags sin ser bloqueado.
**Fix:** Extender `validateAllowedHtml` para verificar también atributos permitidos, o añadir `sanitize-html` como paso adicional en el servidor al persistir el bloque.

---

### [SEC-HIGH-01] Stale closure en Turnstile hace que el CAPTCHA no funcione en producción

**Criticidad:** High (CAPTCHA implementado pero inoperativo)
**Archivo:** `src/features/engagement/components/ContactForm.tsx:54-106`
**Problema:** El `useCallback` de `handleSubmit` captura `turnstileToken` del render inicial (valor: `null`) y no se actualiza cuando el widget resuelve el reto. En producción con `NEXT_PUBLIC_TURNSTILE_SITE_KEY` configurada, el widget renderiza y el usuario resuelve el reto, pero el submit siempre envía `turnstileToken: undefined`. El server action llama `verifyTurnstileToken(undefined)` que retorna `{ success: false, error: "Debes completar la verificación de seguridad." }`. El formulario nunca puede enviarse.

**Fix inmediato:**
```typescript
// ContactForm.tsx: añadir turnstileToken al dep array
const handleSubmit = useCallback(
  async (e: FormEvent<HTMLFormElement>) => {
    // ... código existente sin cambios ...
  },
  [promocionId, turnstileToken], // ← añadir turnstileToken
);
```

---

### [SEC-MAJOR-01] CAPTCHA — `ContactFormGeneric` pasa el token como hidden input (correcto)

**Estado:** Correcto. `ContactFormGeneric` usa `useActionState` con `formAction` y pasa el token como `<input type="hidden" name="turnstileToken">`. El server action lo recoge con `formData.get("turnstileToken")`. Este patrón es correcto y no tiene el problema del stale closure porque el hidden input siempre refleja el estado actual de React en el momento del submit.

---

### [SEC-INFO-01] Sin CAPTCHA en `ContactFormGeneric` cuando no hay site key configurada

**Criticidad:** Low
**Problema:** Si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no está configurada, `TurnstileWidget` renderiza `null` y el hidden input envía un string vacío. `verifyTurnstileToken("")` falla porque `!token` es true con string vacío. En producción sin configurar la env var, el formulario genérico es inutilizable.

La verificación en `verifyTurnstileToken` trata `""` como falsy (correcto en JS: `!"" === true`), por lo que el error está implícitamente cubierto. Sin embargo, la degradación en este caso debería ser explícita: si no hay site key en producción, el formulario debería mostrar un error claro al operador, no silenciosamente rechazar todos los envíos.

**Fix:** Documentar que `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` son variables obligatorias en producción. Ya están en `.env.example` — es suficiente acción.

---

## 10. Performance

### [P-HIGH-01] RESUELTO: `getRelatedProperties` ya usa LEFT JOIN con subquery agregada

El código de `get-related-properties.ts` en esta rama utiliza correctamente el patrón con `tipologiaAgg` como subquery Drizzle con `groupBy(tipologias.promocionId)`, evitando las subqueries correlacionadas por fila que existían en la auditoría anterior. El test `get-related-properties.spec.ts` ha sido actualizado para reflejar el nuevo patrón.

### [P-MEDIUM-01] `/favoritos` descarga hasta 100 promociones para filtrar en cliente

**Estado:** Sin cambios. Pendiente decisión de producto sobre la feature `favorites`.

---

## 11. Deuda Técnica

### Crítica (bloquea funcionalidad en producción)

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | `ContactForm.handleSubmit`: añadir `turnstileToken` al dep array de `useCallback` — el CAPTCHA está implementado pero el token siempre llega `undefined` al server action | 10 min |

### Alta

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-02 | `BlockDescripcion`: sanitizar atributos de evento en HTML de `DESCRIPCION_GENERAL` (pendiente de auditoría anterior) | 1-2h |
| DT-03 | Añadir tests de `verifyTurnstileToken` cubriendo branches: sin secret key en prod, sin token, fetch falla, respuesta con error-codes | 1h |

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-04 | Renumerar pasos en `submit-contact.action.ts` (dos pasos "2.") | 5 min |
| DT-05 | Type casting `as unknown as` en componentes del backoffice (blocks-editor, promocion-section-identity, promocion-section-commercial-status) | 2h |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-06 | Decisión de producto sobre feature `favorites` (eliminar o formalizar en `product.md`) | 30 min (decisión) |
| DT-07 | Test de `ContactFormGeneric` que verifique que `turnstileToken` se incluye como hidden input antes del submit | 30 min |

### Resueltas en esta rama (respecto a auditoría anterior)

| Deuda resuelta | Descripción |
|----------------|-------------|
| ~~DT-01~~ | `createLeadService`: filtro `tenantId` en `WHERE` añadido |
| ~~DT-03~~ | `user_agent` registrado en `consent_records` del formulario comercial |
| ~~DT-04~~ | Test de aislamiento T026 para `createLeadService` |
| ~~DT-05~~ | `TipologiaSyncService` movido a `infrastructure/db/services/` |
| ~~DT-06~~ | Schema base unificado `shared/schemas/contact-base.schema.ts` |
| ~~DT-07~~ | `catch` silencioso en `loadMediaAssets` ahora loggea con `logger.warn` |
| ~~DT-08~~ | `getRelatedProperties` refactorizado con LEFT JOIN y subquery agregada |
| ~~DT-09~~ | CAPTCHA Cloudflare Turnstile implementado (pero ver DT-01 actual) |
| ~~DT-13~~ | `use-publish-validation` extraído a hook separado |
| ~~DT-14~~ | Test de contrato para modo AREA añadido |

---

## 12. Quick Wins

> Cambios < 30 min, seguros de forma independiente, alto impacto.

### QW-01 — Stale closure en `ContactForm.handleSubmit` (~10 min)

```typescript
// src/features/engagement/components/ContactForm.tsx — línea 106
// Cambiar:
    [promocionId],
// Por:
    [promocionId, turnstileToken],
```

Este es el único cambio necesario. El Turnstile ya funciona correctamente en `ContactFormGeneric`; solo `ContactForm` tiene este bug.

---

### QW-02 — Renumerar pasos en `submit-contact.action.ts` (~5 min)

```typescript
// src/features/contact/actions/submit-contact.action.ts
// Cambiar "// 2. Parse and validate" por "// 3. Parse and validate"
// El rate limit es el paso 2, el parse es el paso 3.
```

---

## 13. Refactors Estratégicos

### R-01 — Sanitización robusta de HTML en `DESCRIPCION_GENERAL` (pendiente de auditoría anterior)

**Valor:** Elimina el riesgo de XSS por atributos de evento en HTML almacenado en BD.
**Propuesta:** Añadir un paso de strip de atributos de evento en el schema Zod de `DESCRIPCION_GENERAL` server-side al persistir el bloque. Usar `sanitize-html` (lista blanca de tags Y atributos) o implementación propia.
**Coste:** 1-2h (incluyendo tests). **Riesgo de regresión:** Bajo.

---

### R-02 — Tests unitarios para `verifyTurnstileToken`

**Valor:** Cubre los 4 branches del utility: sin secret key en desarrollo (bypass), sin secret key en producción (error), sin token (error), fetch falla (error), respuesta con error-codes (error). La función es sencilla y tiene cobertura cero en el momento actual.
**Propuesta:** Añadir `src/shared/utils/turnstile.spec.ts` con mocks de `fetch` y `process.env`.
**Coste:** 1h. **Riesgo de regresión:** Muy bajo (solo tests nuevos, sin cambios en producción).

---

## 14. Refactors NO recomendados

### No refactorizar: Mover `handleSubmit` a `useCallback` sin deps o usar `useRef` para el token

La solución mínima (añadir `turnstileToken` al dep array) es la correcta. Convertir `turnstileToken` a `useRef` para evitar la recreación del callback introduciría una abstracción más compleja sin beneficio perceptible: el callback se recrea solo cuando el token cambia (una vez por sesión del widget, no en cada render).

### No refactorizar: Separar `LeadRepository` en repositorios más pequeños

Mismo razonamiento que en auditoría anterior. 599 líneas pero todos pertenecen al mismo dominio. El coste de abstracción supera el beneficio.

### No refactorizar: Extraer `ContactForm` y `ContactFormGeneric` a componente base

Los dos formularios comparten schema base (ya unificado con `contactBaseSchema`) pero tienen flujos completamente distintos. La solución correcta ya está implementada (schema base compartido).

### No refactorizar: Reemplazar la lógica de orquestación en `PromocionRepository.update()`

`TipologiaSyncService.syncInTx()` se llama desde dentro del repositorio. La alternativa (mover la orquestación a un servicio de aplicación) requiere refactorizar la página de edición y los tests asociados. El coste supera el beneficio dado que el servicio está bien encapsulado y el acoplamiento es explícito.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (hoy, antes de merge)

- [ ] [DT-01 / QW-01] Añadir `turnstileToken` al dep array de `useCallback` en `ContactForm` — 10 min
- [ ] [DT-04 / QW-02] Renumerar paso "2." duplicado en `submit-contact.action.ts` — 5 min

### Fase 2 — Corto plazo (próximo sprint)

- [ ] [DT-02 / R-01] Sanitización de atributos de evento en `BlockDescripcion` — 1-2h
- [ ] [DT-03 / R-02] Tests unitarios para `verifyTurnstileToken` — 1h
- [ ] [DT-07] Test de `ContactFormGeneric` que verifique el hidden input de Turnstile — 30 min

### Fase 3 — Medio plazo (backlog)

- [ ] [DT-05] Limpiar castings `as unknown as` en componentes del backoffice — 2h
- [ ] [DT-06] Decisión de producto sobre feature `favorites` — 30 min

### No planificado

- Reducción de `LeadRepository` — no recomendado (ver §14)
- Separación de `ContactForm`/`ContactFormGeneric` en base común — no recomendado (ver §14)

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 9 | Dependencia invertida eliminada; la feature favorites sigue siendo minor debt |
| Simplicidad | 8 | Stale closure en Turnstile; extracción del hook de validación correcta |
| Mantenibilidad | 8 | Tests de dominio robustos; falta cobertura de Turnstile |
| Cohesión | 8 | Bounded contexts bien definidos; `LeadRepository` largo pero cohesionado |
| Acoplamiento | 9 | Sin inversiones de dependencia; `TipologiaSyncService` en su capa correcta |
| Legibilidad | 9 | Código bien nombrado; el índice duplicado es cosmético |
| Calidad del diseño | 8 | Schema base unificado; el casting en backoffice persiste |
| Testing | 8 | T026 nuevo y robusto; Turnstile sin cobertura de tests |
| Seguridad | 7 | CAPTCHA implementado pero con bug que lo hace inoperativo en prod; XSS HTML pendiente |
| Deuda técnica | 9 | Mayoría de deuda crítica anterior resuelta; 1 deuda crítica nueva (stale closure) |
| **Total** | **83/100** | |

**Calificación:** B+

**Justificación:** La rama cierra 10 de las 14 deudas identificadas en la auditoría anterior, incluyendo todas las de Fase 1. El score sube de 76 a 83 (7 puntos). Los 17 puntos restantes para llegar a A se distribuyen: 3 puntos por el stale closure en Turnstile (bug crítico, fix de 10 minutos), 4 puntos por la sanitización de HTML pendiente, 3 puntos por los castings de tipo en el backoffice, y 7 puntos por cobertura de tests en el nuevo subsistema Turnstile. Un sprint de 4 horas resuelve el crítico (10 min) y la cobertura de tests (2h), subiendo el score a ~88 (A-).
