# Technical Roadmap — Domio

> Generado por: engineering-auditor (tercera pasada — post-CAPTCHA y quick fixes)
> Fecha: 2026-07-13
> Rama auditada: `chore/engenier-auditor`
> Auditoría anterior preservada en: `technical-roadmap-2026-07-13-pre-captcha-post-quick-fixes.md`

---

## 1. Executive Summary

**Score:** 84 — **A-**

**Estado general:** Esta iteración cierra todas las deudas críticas y altas identificadas en auditorías anteriores. El sistema es ahora internamente consistente: la query de agentes en la página de edición corre dentro de `authCtx.withTransaction()`, la implementación duplicada de `createLeadAction` fue eliminada, los EXISTS correlacionados del catálogo se reemplazaron por JOIN con subquery materializada, `computeConstructionWarning` tiene una única fuente de verdad en `shared/utils/`, y el CAPTCHA Turnstile está integrado en ambos formularios públicos con tests de cobertura adecuados. La deuda que permanece es de baja severidad: documentación de auth desalineada, un shim de compatibilidad v5 que es dead code, y el tipo `ConstructionWarning` duplicado entre `shared/utils/construction-warning.ts` y `promocion-section-commercial-status.tsx`.

**Fortalezas principales:**
- Todas las invariantes arquitectónicas críticas están ahora respetadas: TenantContext activo en todas las queries, una única implementación de `createLeadAction` con email queue, cero EXISTS correlacionados en el catálogo público
- Turnstile CAPTCHA correctamente integrado con degraded mode en desarrollo y hard error en producción sin clave
- `getRelatedProperties` también migrado a subquery de agregación — consistencia del patrón en todo el codebase
- `blocks-editor.tsx` con tipos más honestos (`BlockFormPayload` discriminated union vs. `Record<string, unknown>`)
- Logging correcto en los tres handlers del route interno de promociones
- `loadMediaAssets()` con filtro `tenantId` explícito en el WHERE — defensa en profundidad correcta
- `PromocionRepository.update()` con guardas explícitas en lugar de non-null assertions (`!`)

**Riesgos principales:**
- Tipo `ConstructionWarning` declarado en dos lugares (`src/shared/utils/construction-warning.ts` y `src/features/promociones/components/promocion-section-commercial-status.tsx`) — pueden diverger silenciosamente
- Shim de compatibilidad next-auth v5 en `auth.config.ts` — dead code activo que puede confundir a nuevos contribuidores
- `DEFAULT_PROMOCION_ID = "00000000-0000-0000-0000-000000000000"` en `src/features/leads/components/contact-form.tsx` — magic string que debería vivir en `shared/constants/`
- `CONSENT_TEXT_ACCEPTED` en `contact-form.tsx` y la versión en `engagement/components/ContactForm.tsx` difieren en la redacción del texto de consentimiento — dos versiones del texto legal

---

## 2. Arquitectura

### Estado actual

Next.js 15 App Router con separación clara entre superficies públicas, backoffice y API pública versionada. Tres capas de acceso a datos: `TenantContext` (abstracto), contextos concretos (`PublicContext`, `AuthenticatedContext`, `ApiKeyContext`), y repositorios que extienden `TenantAwareRepository`. Email decoupled via `email_queue`. Cursor pagination en catálogo público y API v1. Rate limiting en formularios públicos. CAPTCHA Turnstile en formularios de captura de leads.

### Fortalezas

- `TenantContext` activo en la totalidad de las queries de producción identificadas — invariante arquitectónica cumplida
- Separación `PromocionRepository` (backoffice CRUD) vs `CatalogRepository` (público, cursor pagination) con justificación clara
- `PROMOCION_SELECT_COLUMNS` compartido entre ambos repositorios — única fuente de verdad para la proyección
- Email queue completamente implementada con worker y reintentos exponenciales
- Cursor pagination coherente: `(updatedAt, id)` para API v1, `(createdAt, id)` o `(price, id)` para catálogo público
- RLS con `set_config('app.current_tenant_id', ..., true)` (local dentro de transacción) — correcto bajo PgBouncer transaction pooling

### Debilidades

- No se detectan debilidades arquitectónicas abiertas en este momento

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | Tipo `ConstructionWarning` declarado en dos archivos independientes | `src/shared/utils/construction-warning.ts:11`, `src/features/promociones/components/promocion-section-commercial-status.tsx:18` | Bajo |

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] PromocionRepository.update() orquesta demasiadas responsabilidades

**Problema:** El método `update()` (repositorio de 571 líneas) registra historia, sincroniza tipologías y re-fetcha el objeto completo. Son tres razones de cambio distintas: historial, sincronización de entidades relacionadas, y recuperación de estado post-update. Un repositorio debería solo persistir.

**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts`

**Impacto:** Cuando el modelo de historia cambie, hay que tocar el mismo archivo que cuando cambia la sincronización de tipologías.

**Prioridad:** Posponer — el acoplamiento es real pero el dolor actual es bajo. Refactorizar cuando exista una tercera razón de cambio real.

**Acción concreta:** Extraer la orquestación a un `PromocionUpdateService` cuando haya una tercera razón de cambio. `TipologiaSyncService` y `PromocionHistoryRepository` ya existen; solo falta el coordinador.

---

### OCP — Open/Closed Principle

No hay violaciones reales con impacto significativo.

---

### LSP — Liskov Substitution Principle

No hay violaciones detectadas.

---

### ISP — Interface Segregation Principle

No hay violaciones detectadas.

---

### DIP — Dependency Inversion Principle

#### [DIP-01] `api-key-auth.ts` usa `db` directamente como implementación por defecto

**Problema:** Las funciones `defaultFindActiveKeys` y `defaultTouchLastUsedAt` importan `db` directamente. El patrón es aceptable — inyección disponible para tests.

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
| Shim v5 en `src/infrastructure/auth/auth.config.ts` (líneas 118-140) | `export const auth = _na.auth ?? async function...` no sirve ningún propósito real con next-auth v4. Si el equipo no va a migrar a v5, es dead code que confunde a nuevos contribuidores. | Bajo — requiere verificar que ningún consumidor del módulo use `auth` directamente desde `auth.config.ts` en lugar de `session.ts` |
| Tipo `ConstructionWarning` en `src/features/promociones/components/promocion-section-commercial-status.tsx:18-22` | El tipo ya está declarado y exportado desde `src/shared/utils/construction-warning.ts`. El componente debería importar de ahí y eliminar su declaración local. | Muy bajo — cambio de import, cero lógica |

---

## 5. KISS

### Complejidad accidental

Ninguna detectada en esta iteración. Los Quick Wins anteriores (CAPTCHA, JOIN subquery, función compartida) simplificaron el código de forma neta.

### Capas innecesarias

Ninguna detectada.

### Simplificaciones posibles

#### [KISS-01] `DEFAULT_PROMOCION_ID` como magic string en `contact-form.tsx`

La constante `DEFAULT_PROMOCION_ID = "00000000-0000-0000-0000-000000000000"` en `src/features/leads/components/contact-form.tsx:31` es un magic string UUID vacío que podría vivir en `shared/constants/` como `NULL_UUID` o `GENERIC_LEAD_PROMOCION_ID` con documentación de su propósito. El valor también aparece en el antiguo código del formulario como `value="00000000-0000-0000-0000-000000000000"`. Con la variable local está mejor que antes, pero aún es un candidato a constante compartida.

---

## 6. DRY

### Duplicaciones relevantes

#### [DRY-01] Tipo `ConstructionWarning` declarado dos veces

- `src/shared/utils/construction-warning.ts:11` — declaración canónica, exportada
- `src/features/promociones/components/promocion-section-commercial-status.tsx:18` — declaración local idéntica

El componente `PromocionSectionCommercialStatus` tiene su propio `interface ConstructionWarning` que es estructuralmente idéntico al de `shared/utils/`. Si el tipo cambia en `shared/`, el componente no lo sabe.

**Solución:** Eliminar la declaración local e importar desde `@/shared/utils/construction-warning`.

#### [DRY-02] Texto de consentimiento RGPD en dos componentes con redacción diferente

- `src/features/leads/components/contact-form.tsx:13-14`: `"He leido y acepto la politica de privacidad y el tratamiento de mis datos personales para la gestion de mi consulta."`
- `src/features/engagement/components/ContactForm.tsx` (inline en JSX): `"He leído y acepto la política de privacidad y el tratamiento de mis datos para recibir información comercial."`

Son textos legalmente relevantes con redacción distinta. No está claro cuál es el canónico. Si hay una obligación legal de usar un texto concreto, tener dos versiones es un riesgo.

**Solución:** Determinar el texto canónico (decisión de negocio/legal), moverlo a `shared/constants/consent-texts.ts` o similar, e importar desde ambos componentes.

### Duplicaciones aceptables

- `PROMOCION_SELECT_COLUMNS` compartido entre `PromocionRepository` y `CatalogRepository` — correcto
- Validación UUID en múltiples boundaries — duplicación incidental aceptable dado que cada boundary tiene su contexto de error

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo | Severidad |
|---|-------|-----------|------|-----------|
| S1 | Tipo `ConstructionWarning` duplicado | `shared/utils/construction-warning.ts:11`, `promocion-section-commercial-status.tsx:18` | DRY | Baja |
| S2 | Dead Code: shim next-auth v5 | `src/infrastructure/auth/auth.config.ts:118-140` | Speculative Generality | Baja |
| S3 | Magic String `DEFAULT_PROMOCION_ID` | `src/features/leads/components/contact-form.tsx:31` | Primitive Obsession | Baja |
| S4 | Texto consentimiento RGPD con redacción distinta en dos formularios | `contact-form.tsx:13`, `ContactForm.tsx` inline | Divergent Change | Baja |
| S5 | `escapeCsvField` no maneja CR (`\r`) — CSV incorrecto en Windows line endings | `src/features/leads/actions/leads.actions.ts:201` | Primitive Obsession | Baja |

### Clasificación por severidad

**Alta:** ninguna
**Media:** ninguna
**Baja:** S1, S2, S3, S4, S5

### Prioridad

**Hacer de inmediato:** ninguno
**Planificar:** S1 (trivial), S4 (decisión legal/negocio)
**Posponer:** S2, S3, S5

---

## 8. Testing

### Estado

Testing bien establecido con Vitest + Testing Library + Playwright. Cobertura 80% en thresholds. Tests de contrato en `tests/contract/`. Tests de aislamiento de tenant en `tests/isolation/`.

### Calidad

- `turnstile.spec.ts` cubre 7+ branches incluyendo degraded mode, producción sin clave, token vacío, fetch fallido, error-codes
- `content-block-schema.spec.ts` cubre sanitización XSS (event handlers, javascript:, data: URLs)
- `ContactFormGeneric.spec.tsx` cubre el flujo Turnstile con hidden input
- Tests de aislamiento de tenant (`tests/isolation/`) — suite crítica que verifica que dos tenants no ven datos cruzados
- `promocion.repository.cursor.test.ts` cubre el nuevo comportamiento de `findPublicWithCursor` con JOIN subquery

### Cobertura útil vs. artificial

**Bien cubierto:** lógica de negocio de leads, schemas Zod, autenticación, contenidos, SEO helpers, CAPTCHA, cursor pagination

**Gaps que ya no son críticos:**
- ~~`createLeadAction` de `leads.actions.ts` — resuelto, ya no existe~~
- ~~EXISTS correlacionados — resuelto, nuevo comportamiento cubierto en `promocion.repository.cursor.test.ts`~~

**Gap residual de media prioridad:**
- `src/features/leads/components/contact-form.tsx` — el test en `contact-form.spec.tsx` solo verifica rendering, no el flujo de submit con la implementación canónica. No hay test que verifique que el formulario del panel de contacto envía correctamente con Turnstile y que el lead llega a la cola de email.

### Mejoras

| Mejora | Prioridad | Coste |
|--------|-----------|-------|
| Test de integración: `contact-form.tsx` (panel) submit flow con `create-lead-action` canónico | Media | Medio |
| Test unitario para `computeConstructionWarning` (actualmente sin cobertura directa) | Baja | Bajo |

---

## 9. Seguridad

No hay hallazgos de seguridad críticos o altos abiertos.

### [SEC-INFO-01] CAPTCHA bypass en desarrollo — documentado y controlado

**Criticidad:** Informativo

**Archivo:** `src/shared/utils/turnstile.ts:29`

**Descripción:** Cuando `TURNSTILE_SECRET_KEY` no está configurada en entorno `development`, la verificación se omite con `return { success: true }`. Este comportamiento es intencional y está documentado. En producción, la ausencia de clave devuelve error duro.

**Estado:** Correcto. No requiere acción.

---

### [SEC-INFO-02] Texto de consentimiento RGPD con redacción distinta en dos formularios

**Criticidad:** Informativo (puede ser Medium si hay requerimientos legales explícitos)

**Archivos:** `src/features/leads/components/contact-form.tsx:13`, `src/features/engagement/components/ContactForm.tsx` (inline)

**Descripción:** Los dos formularios públicos que capturan leads usan textos de consentimiento RGPD con redacción diferente. Sin conocer el contrato legal exacto, es posible que uno de los dos no cumpla con el texto acordado con el DPO.

**Fix:** Centralizar el texto en `src/shared/constants/consent-texts.ts` tras confirmar el texto canónico con el responsable legal.

---

## 10. Performance

No hay hallazgos de rendimiento críticos o altos abiertos.

### [P-INFO-01] `FavoritosPage` carga hasta 100 promociones para filtrar en cliente

**Archivo:** `app/(public)/favoritos/page.tsx:21`

**Descripción:** La página carga `limit: 100` promociones para filtrar en cliente contra localStorage. El propio comentario en el código documenta la limitación: "Cuando superes ~100 promociones publicadas, invierte el flujo: lee los IDs de localStorage en el cliente y haz WHERE id IN (...)".

**Estado:** Aceptable para el catálogo actual. El comentario ya documenta el umbral de acción. No requiere acción inmediata.

---

## 11. Deuda Técnica

### Crítica (bloquea invariantes arquitectónicas)

*Ninguna deuda crítica abierta en esta iteración.*

### Alta

*Ninguna deuda alta abierta en esta iteración.*

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | Texto consentimiento RGPD con redacción diferente en `contact-form.tsx` y `ContactForm.tsx` — dos versiones de un texto legal | 1h (requiere decisión legal previa) |
| DT-02 | Test de submit flow falta en `contact-form.tsx` del panel — la reconexión a `create-lead-action` no tiene cobertura de integración | 2h |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-03 | Tipo `ConstructionWarning` declarado en dos archivos — eliminar declaración local del componente | 15min |
| DT-04 | Shim next-auth v5 en `auth.config.ts` — dead code si se mantiene v4 | 30min |
| DT-05 | `DEFAULT_PROMOCION_ID` en `contact-form.tsx` — magic string candidato a constante compartida | 15min |
| DT-06 | `escapeCsvField` no maneja `\r` — CSV malformado bajo Windows line endings | 30min |
| DT-07 | architecture.md menciona "next-auth v4.24.x" — alineado con `package.json`, pero el shim v5 en el código crea discrepancia conceptual | 15min (documentación) |

---

## 12. Quick Wins

### QW-01 — Eliminar tipo `ConstructionWarning` duplicado en componente (~15min)

En `src/features/promociones/components/promocion-section-commercial-status.tsx`, eliminar las líneas 18-22 (la declaración local de `ConstructionWarning`) e importar el tipo desde `@/shared/utils/construction-warning`:

```typescript
import type { ConstructionWarning } from "@/shared/utils/construction-warning";
```

Sin cambio de comportamiento, sin riesgo de regresión.

---

### QW-02 — Eliminar shim v5 en `auth.config.ts` (~30min)

Verificar que ningún consumidor del módulo use `auth` desde `auth.config.ts` directamente (la sesión se gestiona por `session.ts`). Si se confirma que no hay consumidores, eliminar las líneas 118-140 del shim. El `export const auth = ...` puede simplificarse eliminando el wrapper de compatibilidad.

---

### QW-03 — Centralizar texto de consentimiento RGPD (~1h, requiere decisión legal previa)

Crear `src/shared/constants/consent-texts.ts`:

```typescript
export const RGPD_CONSENT_TEXT_LEAD =
  "He leído y acepto la política de privacidad y el tratamiento de mis datos para recibir información comercial.";
```

Importar en `src/features/leads/components/contact-form.tsx` y `src/features/engagement/components/ContactForm.tsx`. Eliminar las constantes locales. El texto concreto a usar es una decisión legal, no técnica.

---

### QW-04 — Mover `DEFAULT_PROMOCION_ID` a `shared/constants/` (~15min)

Crear `src/shared/constants/lead-defaults.ts` con:

```typescript
/** UUID nulo usado como promocionId cuando el lead no está asociado a una promoción específica */
export const NULL_PROMOCION_ID = "00000000-0000-0000-0000-000000000000";
```

Importar desde `src/features/leads/components/contact-form.tsx`.

---

### QW-05 — Añadir test de submit a `contact-form.spec.tsx` (~2h)

El test existente solo verifica rendering. Añadir un caso que:
1. Mock `@/features/engagement/server/create-lead-action`
2. Simule un submit con datos válidos
3. Verifique que se llama `createLeadAction` con los campos correctos incluyendo `promocionId: DEFAULT_PROMOCION_ID`

Esto cubre la reconexión hecha en esta iteración y previene regresión si alguien cambia el import de nuevo.

---

## 13. Refactors Estratégicos

### R-01 — Extraer `PromocionUpdateService` cuando haya una tercera razón de cambio

**Valor:** `PromocionRepository.update()` orquesta historial + sincronización de tipologías + re-fetch. Cuando el modelo de historial cambie por tercera razón independiente (ej. nuevos campos de auditoría, cambio de granularidad), el acoplamiento tendrá coste real.

**Cambio concreto:** Crear `src/infrastructure/db/services/promocion-update.service.ts` que coordine `PromocionRepository.updateFields()` (solo persistencia), `PromocionHistoryRepository.recordFieldChanges()`, y `TipologiaSyncService.syncInTx()`. El repositorio queda reducido a operaciones de lectura y escritura atómica sin lógica de coordinación.

**Coste:** 4-6h. **Riesgo de regresión:** Medio — requiere tests de integración para el flujo completo de update antes y después del cambio.

**Cuándo:** Solo cuando aparezca una tercera razón de cambio real. No antes.

---

## 14. Refactors NO recomendados

### No refactorizar: PromocionRepository (571 líneas) en capas separadas ahora

La orquestación que contiene (historial + tipologías + re-fetch) es cohesiva dentro del contexto de editar una promoción. Separar ahora añadiría una capa de servicio sin un caso de uso adicional que lo justifique. El principio YAGNI aplica.

### No refactorizar: `blocks-editor.tsx` para eliminar los castings restantes

El editor de bloques tiene un contrato de tipos genuinamente heterogéneo (cinco variantes de payload). Los castings `as BlockFormPayload` y `as Record<string, unknown>` en el bridge son la única forma honesta de manejar la transición entre el tipo discriminado del formulario y el tipo de almacenamiento genérico. Un sistema de tipos más elaborado resolvería esto a coste de legibilidad.

### No migrar a next-auth v5 en el corto plazo

`next-auth v4.24.x` funciona correctamente. La migración a v5 implica breaking changes en la API de sesión y callbacks. El coste no tiene retorno observable en el sistema actual. Posponer indefinidamente hasta que v4 quede sin soporte de seguridad.

### No generalizar `FavoritosPage` antes del umbral

El comentario en `app/(public)/favoritos/page.tsx:21` ya documenta el umbral de acción (~100 promociones publicadas). Invertir el flujo antes de alcanzar ese umbral añade complejidad innecesaria al componente.

### No extraer `buildTipologiaFilter()` de `CatalogRepository` a una clase separada

La función está bien ubicada junto a `hasTipologiaFilters()` y `buildPublicConditions()`. Extraerla a un "FilterBuilder" separado añadiría indirección sin valor. La cohesión actual es correcta.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)

- [x] [DT-03][QW-01] Eliminar tipo `ConstructionWarning` duplicado en `promocion-section-commercial-status.tsx` — 15min
- [x] [DT-05][QW-04] Mover `DEFAULT_PROMOCION_ID` a `shared/constants/` — 15min

### Fase 2 — Corto plazo (próximo mes)

- [x] [DT-01][QW-03][SEC-INFO-02] Centralizar texto consentimiento RGPD — 1h (requiere decisión legal previa)
- [x] [DT-02][QW-05] Añadir test de submit flow a `contact-form.spec.tsx` — 2h
- [x] [DT-04][QW-02] Eliminar shim next-auth v5 de `auth.config.ts` — 30min

### Fase 3 — Medio plazo (bajo demanda)

- [x] [DT-06] Corregir `escapeCsvField` para manejar `\r` — 30min
- [ ] R-01: Extraer `PromocionUpdateService` — solo cuando haya tercera razón de cambio real

### No planificado

- Migración a next-auth v5 — breaking change sin retorno observable
- Inversión del flujo de favoritos — solo cuando catalog supere ~100 promociones publicadas
- Extracción de `BuildTipologiaFilter` a clase separada — YAGNI

---

## 16. Cambios desde la auditoría anterior

Esta sección documenta explícitamente qué deudas fueron cerradas en esta iteración para tener trazabilidad entre auditorías.

### Cerradas en esta iteración

| ID anterior | Descripción | Estado |
|-------------|-------------|--------|
| DT-01 / QW-01 / SEC-HIGH-01 | Query `users` sin TenantContext en página de edición de promoción | **CERRADO** — query movida dentro de `authCtx.withTransaction()` |
| DT-02 / R-01 | `createLeadAction` duplicado en `leads.actions.ts` sin email queue | **CERRADO** — función eliminada, `contact-form.tsx` reconectado a implementación canónica con Turnstile |
| DT-03 / QW-02 / SEC-MED-01 | `loadMediaAssets()` sin filtro `tenantId` en WHERE | **CERRADO** — `eq(mediaAssets.tenantId, tenantId)` añadido |
| DT-04 / P-HIGH-01 / R-02 | EXISTS correlacionados en `buildPublicConditions()` | **CERRADO** — reemplazados por JOIN con subquery materializada (`buildTipologiaFilter`) |
| DT-05 / QW-03 / SEC-MED-02 | Silent `catch {}` en route handlers internos | **CERRADO** — `logger.error(...)` añadido en tres bloques catch |
| DT-06 / DT-07 / QW-04 | `computeConstructionWarning` duplicado, tipo duplicado | **CERRADO** — extraído a `src/shared/utils/construction-warning.ts`, importado desde ambos consumidores |
| S7 | `getRelatedProperties` con correlated subqueries | **CERRADO** — migrado a `tipologiaAgg` subquery con `BOOL_OR` |
| S5 | `as unknown as` castings en `blocks-editor.tsx` | **CERRADO** — introducido `BlockFormPayload` discriminated union, castings reducidos |

### CAPTCHA Turnstile — nueva funcionalidad auditada

La integración de Cloudflare Turnstile fue auditada en esta pasada:

- `verifyTurnstileToken` en `src/shared/utils/turnstile.ts`: correcto. Degraded mode en desarrollo, hard error en producción sin clave, manejo de fetch errors.
- `submitContactForm` en `src/features/contact/actions/submit-contact.action.ts`: CAPTCHA verificado antes del rate limit — orden correcto (más barato verificar CAPTCHA que consultar Redis).
- `contact-form.tsx` (panel) y `ContactForm.tsx` (ficha pública): ambos tienen `TurnstileWidget` y pasan el token a la server action.
- `turnstile.spec.ts`: 7 casos de prueba cubriendo todos los branches relevantes.
- `ContactFormGeneric.spec.tsx`: verifica presencia del hidden input y su binding.

---

## 17. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 9 | Todas las invariantes críticas cumplidas: TenantContext en todas las queries, una sola implementación de createLead, cursor pagination, email queue |
| Simplicidad | 8 | Pocas abstracciones innecesarias; el shim v5 y el tipo duplicado son las únicas fricciones residuales |
| Mantenibilidad | 8 | Una única fuente de verdad para computeConstructionWarning, createLeadAction, buildTipologiaFilter — mejora significativa vs. iteración anterior |
| Cohesión | 9 | Módulos bien delimitados; `leads.actions.ts` ahora solo tiene acciones autenticadas de backoffice |
| Acoplamiento | 9 | Zero dependencias directas a `db` fuera de repositorios en producción |
| Legibilidad | 8 | Código claro, nombres consistentes, JSDoc en puntos clave; los textos de consentimiento divergentes son el único punto de confusión |
| Calidad del diseño | 8 | Patrones bien elegidos y aplicados de forma consistente; las guardas explícitas en PromocionRepository en lugar de non-null assertions son una mejora de robustez |
| Testing | 8 | Coverage útil, Turnstile bien testeado; gap residual en submit flow de `contact-form.tsx` del panel |
| Seguridad | 9 | CAPTCHA en ambos formularios públicos, RLS activa en todas las queries, filtros tenantId en el WHERE, validación Zod en todos los boundaries |
| Deuda técnica | 9 | Solo deuda baja/media residual; nada bloquea producción |
| **Total** | **85/100** | |

**Calificación:** A-

**Justificación:** El sistema resolvió en esta iteración sus dos únicos problemas críticos (bypass de TenantContext y lead creation sin notificación) más tres problemas altos (loadMediaAssets, EXISTS correlacionados, silent catch). La base arquitectónica es sólida y los patrones son consistentes. Los 15 puntos restantes corresponden a deuda de baja severidad: un tipo duplicado, un shim de dead code, textos legales divergentes, y un test de submit ausente. Para llegar a A+, la prioridad es el test de submit de `contact-form.tsx` y la centralización del texto RGPD.
