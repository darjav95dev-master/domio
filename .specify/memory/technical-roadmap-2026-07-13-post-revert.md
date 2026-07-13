# Technical Roadmap — Domio (Re-auditoría post-refactor)

> Generado por: engineering-auditor
> Fecha: 2026-07-13
> Rama auditada: main (post engineering-refactor)
> Score anterior (pre-refactor): 85/100 — A-

---

## 1. Executive Summary

**Score:** 89 — **A-**

**Estado general:** El engineering-refactor ejecutó las 3 fases del roadmap anterior con resultados sólidos. Los 4 God Objects principales fueron descompuestos: `PromocionRepository` (559→374 líneas), `LeadRepository` (593→479 líneas), `promocion-form.tsx` (547→237 líneas), y `lead-detail.tsx` (507→420 líneas). Se crearon 7 archivos nuevos con responsabilidades bien delimitadas. Los 1712 tests pasan, el typecheck está limpio. Sin embargo, se detectaron dos problemas de proceso: (1) el refactor agent tocó 12+ archivos fuera del scope aprobado del roadmap, y (2) hay 1 error de lint (import sin usar) en un archivo nuevo. `lead-detail.tsx` solo se redujo parcialmente (420 líneas vs target ~150) — la extracción del hook fue correcta pero el componente aún contiene demasiada lógica de presentación condicional. A pesar de estos hallazgos, el código está notablemente más limpio y los patrones SRP se respetan mejor.

**Fortalezas principales (preservadas del refactor):**
- Multi-tenant DNA rigurosamente respetado — sin cambios en TenantContext, RLS, ni SET LOCAL.
- `PromocionRepository` ahora delega cursor pagination a `PromocionCursorQuery` y history recording a `PromocionHistoryRecorder` — SRP respetado.
- `LeadRepository` ahora delega read marks a `LeadReadMarkRepository` con LEFT JOIN optimizado.
- `promocion-form.tsx` reducido de 547→237 líneas con hook `usePromocionForm` (392 líneas) bien estructurado.
- CSV escaping unificado en `src/shared/utils/csv.ts` — una sola implementación.
- `KIND_LABELS` centralizado en `domain-labels.ts` — una sola fuente de verdad.
- `MediaService.reorderGallery` ahora usa batch CASE expression en lugar de N UPDATEs.
- Tests: 182 files, 1712 tests — todos pasan. Typecheck limpio.
- Backward compatibility preservada con re-exports en `promocion.repository.ts`.

**Riesgos principales:**
- **Scope violation:** El refactor agent modificó 12+ archivos fuera del roadmap aprobado (auth.config.ts, session.ts, create-institutional-lead.ts, FilterBar.tsx, ContactForm.tsx, etc.). Los cambios son mayoritariamente mejoras, pero violan la instrucción explícita "Never touch what is not in the roadmap".
- **Lint error:** `inArray` importado sin usar en `promocion-cursor.query.ts`.
- **R-03 parcial:** `lead-detail.tsx` solo bajó a 420 líneas (target ~150). El hook fue extraído pero el componente aún contiene lógica de presentación extensa.
- **`usePromocionForm` es grande:** 392 líneas — la lógica de estado se movió del componente al hook, pero el hook en sí es extenso.

---

## 2. Arquitectura

### Estado actual

```
app/(public)/         → Web pública comercial (SSR/ISR, PublicContext)
app/(auth)/panel/     → Backoffice (AuthenticatedContext, sesión JWT)
app/api/v1/           → API pública versionada (ApiKeyContext, rate limit)
app/api/internal/     → Endpoints del backoffice (requireAuth)

src/features/         → 14 módulos con hooks extraídos en leads/ y promociones/
src/infrastructure/   → DB (15 repositorios — 2 nuevos), auth, email, media,
                        rate-limiting, tenant, slug, observability
src/shared/           → Tipos, constantes, schemas, componentes, utils (+csv.ts)
```

**Nuevos archivos del refactor:**
- `src/infrastructure/db/repositories/promocion-cursor.query.ts` (165 líneas) — cursor pagination
- `src/infrastructure/db/repositories/promocion-history-recorder.ts` (74 líneas) — history recording
- `src/infrastructure/db/repositories/lead-read-mark.repository.ts` (142 líneas) — read marks + LEFT JOIN
- `src/shared/utils/csv.ts` (30 líneas) — CSV escaping unificado
- `src/features/leads/hooks/use-lead-detail.ts` (148 líneas) — lógica de lead-detail
- `src/features/promociones/hooks/use-promocion-form.ts` (392 líneas) — lógica de promocion-form
- `tests/integration/promocion-publish-flow.test.ts` — test draft→publish→revalidate

### Fortalezas

- Todas las fortalezas del audit anterior se preservan.
- **SRP mejorado:** Los 4 God Objects fueron descompuestos en componentes más pequeños con responsabilidades únicas.
- **DRY mejorado:** CSV escaping y KIND_LABELS unificados.
- **Performance mejorado:** `getUnreadCount` usa LEFT JOIN, `reorderGallery` usa batch UPDATE.
- **Backward compatibility:** Re-exports en `promocion.repository.ts` mantienen los imports existentes funcionando.

### Debilidades

- **`lead-detail.tsx` sigue siendo grande** (420 líneas) — el hook se extrajo pero el componente aún tiene demasiada lógica de presentación condicional.
- **`usePromocionForm` es extenso** (392 líneas) — la lógica se movió del componente al hook, pero el hook en sí es grande.
- **Scope violation del refactor agent** — modificó archivos fuera del roadmap sin autorización.
- **Service layer sigue siendo inconsistente** — solo `PromocionPublishService` y `ContentService` son services formales.

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | `lead-detail.tsx` solo se redujo parcialmente (420 líneas vs target ~150) | `src/features/leads/components/lead-detail.tsx` | Medio |
| A2 | `usePromocionForm` es extenso (392 líneas) — posible subdivisión | `src/features/promociones/hooks/use-promocion-form.ts` | Medio |
| A3 | Scope violation: 12+ archivos modificados fuera del roadmap | auth, contact, engagement, catalog | Medio (proceso) |
| A4 | Lint error: `inArray` import sin usar | `src/infrastructure/db/repositories/promocion-cursor.query.ts` | Bajo |

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] PromocionRepository — RESUELTO ✅
**Estado anterior:** 559 líneas con 5 responsabilidades.
**Estado actual:** 374 líneas. Cursor pagination extraída a `PromocionCursorQuery` (165 líneas), history recording extraída a `PromocionHistoryRecorder` (74 líneas). El repositorio principal ahora tiene CRUD + findById + update + create + delete + assembleTipologias.
**Prioridad:** Completado.

#### [SRP-02] LeadRepository — RESUELTO ✅
**Estado anterior:** 593 líneas con 6 responsabilidades.
**Estado actual:** 479 líneas. Read marks extraídos a `LeadReadMarkRepository` (142 líneas) con LEFT JOIN optimizado. CSV export delegado a `shared/utils/csv.ts`.
**Prioridad:** Completado.

#### [SRP-03] lead-detail.tsx — PARCIAL ⚠️
**Estado anterior:** 507 líneas mezclando UI + estado + lógica.
**Estado actual:** 420 líneas. Hook `useLeadDetail` (148 líneas) extraído correctamente. Pero el componente aún contiene lógica de presentación condicional extensa (tabs, reassign form, note form, history view).
**Prioridad:** Planificar (fase adicional)
**Acción concreta:** Extraer sub-componentes: `LeadNotesSection`, `LeadHistorySection`, `LeadReassignDialog`. Esto reduciría lead-detail.tsx a ~150-200 líneas.

#### [SRP-04] promocion-form.tsx — RESUELTO ✅
**Estado anterior:** 547 líneas mezclando UI + estado + lógica.
**Estado actual:** 237 líneas. Hook `usePromocionForm` (392 líneas) extraído con toda la lógica de estado, autosave, publish validation y section handlers. El componente ahora es presentación pura que delega al hook.
**Prioridad:** Completado.

### OCP, LSP, ISP, DIP — sin cambios desde el audit anterior
No hay nuevas violaciones. Los patrones existentes se preservan.

---

## 4. YAGNI

### Código eliminable

| Código | Motivo | Riesgo de eliminar |
|--------|--------|--------------------|
| Import `inArray` sin usar en `promocion-cursor.query.ts` | Importado pero no utilizado — error de lint | Muy bajo |

### Sin cambios adicionales
No se detectaron nuevas abstracciones o interfaces innecesarias.

---

## 5. KISS

### Sin cambios significativos
La extracción de hooks y repositorios mejora la simplicidad de los componentes principales sin introducir complejidad accidental.

### Observación
`usePromocionForm` (392 líneas) es un hook extenso. Contiene: formReducer, 6 section onChange handlers, sendPatch, buildPayload, handleSaveDraft, handlePublish, handleDiscardDraft. Podría subdividirse en hooks más pequeños (`usePromocionAutosave`, `usePromocionPublish`) pero el coste/beneficio es marginal — el hook es cohesivo y su tamaño refleja la complejidad real del formulario.

---

## 6. DRY

### Duplicaciones previas — RESUELTAS ✅

#### [DRY-01] CSV escaping — RESUELTO ✅
Unificado en `src/shared/utils/csv.ts`. Ambos consumidores (`arsop.repository.ts` y `leads.actions.ts`) ahora importan de la misma fuente.

#### [DRY-02] KIND_LABELS — RESUELTO ✅
Centralizado en `src/shared/constants/domain-labels.ts`. Los 3 componentes ahora importan la constante.

### Duplicaciones aceptables — sin cambios
- `withTransaction` boilerplate: inherente a Drizzle, no tocar.
- `buildFilterConditions` en diferentes repositorios: duplicación incidental.
- Cursor pagination en 4 métodos: variaciones reales justifican la separación.

---

## 7. Code Smells

### Listado actualizado

| # | Smell | Ubicación | Tipo | Severidad | Estado |
|---|-------|-----------|------|-----------|--------|
| S1 | ~~PromocionRepository — 559 líneas~~ | — | God Class | ~~Alta~~ | ✅ Resuelto (374 líneas) |
| S2 | ~~LeadRepository — 593 líneas~~ | — | God Class | ~~Alta~~ | ✅ Resuelto (479 líneas) |
| S3 | lead-detail.tsx — 420 líneas | `src/features/leads/components/lead-detail.tsx` | Long Component | Media | ⚠️ Parcial (target ~150) |
| S4 | ~~promocion-form.tsx — 547 líneas~~ | — | Long Component | ~~Alta~~ | ✅ Resuelto (237 líneas) |
| S5 | ~~CSV escaping duplicado~~ | — | DRY | ~~Media~~ | ✅ Resuelto |
| S6 | ~~KIND_LABELS duplicado~~ | — | DRY | ~~Media~~ | ✅ Resuelto |
| S7 | ~~reorderGallery N UPDATEs~~ | — | N queries | ~~Media~~ | ✅ Resuelto (batch CASE) |
| S8 | ~~getUnreadCount subquery SQL~~ | — | Performance | ~~Media~~ | ✅ Resuelto (LEFT JOIN) |
| S9 | Dos sistemas paralelos de content blocks | `promocion-content-block.repo` + `content-block.repo` | Divergent Change | Media | Sin cambios (aceptable) |
| S10 | CatalogRepository — 580 líneas | `src/infrastructure/db/repositories/catalog.repository.ts` | Long Class | Media | Sin cambios (aceptable) |
| S11 | `inArray` import sin usar | `promocion-cursor.query.ts:1` | Dead Code | Baja | ❌ Nuevo |
| S12 | ~~src/context/ vacío~~ | — | Lazy Class | ~~Baja~~ | ✅ Resuelto |
| S13 | `usePromocionForm` — 392 líneas | `src/features/promociones/hooks/use-promocion-form.ts` | Long Hook | Baja | Nuevo (aceptable) |

### Clasificación por severidad
- **Alta:** Ninguna — todos los smells altos fueron resueltos ✅
- **Media:** S3 (lead-detail.tsx parcial), S9 (content blocks — aceptable), S10 (CatalogRepository — aceptable)
- **Baja:** S11 (lint error), S13 (hook extenso — aceptable)

### Prioridad
- **Hacer de inmediato:** S11 (eliminar import sin usar — 30 segundos)
- **Planificar:** S3 (extraer sub-componentes de lead-detail.tsx)
- **Posponer:** S9, S10, S13 (aceptables)

---

## 8. Testing

### Estado
- **182 test files, 1712 tests — todos pasan** ✅
- Typecheck limpio ✅
- Lint: 1 error (import sin usar) ❌

### Mejoras desde el audit anterior
- Nuevo test de integración: `tests/integration/promocion-publish-flow.test.ts` (draft → publish → revalidate)
- Tests de auth actualizados para reflejar los cambios en auth.config.ts
- Tests de session actualizados para mockear `getServerSession` directamente

### Cobertura
La cobertura se mantiene en el mismo nivel alto del audit anterior, con la adición del flujo draft → publish → revalidate que era una mejora pendiente.

---

## 9. Seguridad

### Sin cambios críticos
Todas las medidas de seguridad del audit anterior se preservan:
- Auth con JWT + rate limiting en login ✅
- RLS en todas las tablas ✅
- API keys con bcrypt + prefix filtering ✅
- Validación Zod en todos los boundaries ✅
- Sentry con sanitización de secrets ✅

### Observación sobre cambios fuera de scope
El refactor agent eliminó el wrapper v5-compatible de `auth.config.ts` (handlers, auth, signIn, signOut exports). Esto era código defensivo para una posible migración a NextAuth v5. Su eliminación simplifica el código pero elimina la preparación para esa migración. **No es un problema de seguridad** — la autenticación sigue funcionando correctamente con el patrón v4 estándar. Es una decisión de diseño que debería haber sido aprobada explícitamente.

---

## 10. Performance

### Mejoras confirmadas

#### [P-MED-01] reorderGallery — RESUELTO ✅
Ahora usa batch CASE expression en lugar de N UPDATEs secuenciales. Patrón consistente con `PromocionContentBlockRepository.reorderContentBlocks`.

#### [P-MED-02] getUnreadCount — RESUELTO ✅
Ahora usa LEFT JOIN con `IS NULL` en lugar de subquery `NOT IN`. Más eficiente con tablas grandes.

### Sin nuevos problemas de performance

---

## 11. Deuda Técnica

### Crítica
No hay deuda crítica.

### Alta

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | `lead-detail.tsx` (420 líneas) — extraer sub-componentes (LeadNotesSection, LeadHistorySection, LeadReassignDialog) | 2-3h |

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-02 | Eliminar import `inArray` sin usar en `promocion-cursor.query.ts` | 30 segundos |
| DT-03 | Evaluar subdivisión de `usePromocionForm` (392 líneas) en hooks más pequeños | 2-3h (opcional) |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-04 | Scope violation: revisar que los 12+ cambios fuera de roadmap sean seguros a largo plazo | 1h (review) |

---

## 12. Quick Wins

### QW-01 — Eliminar import sin usar (~30 segundos)

En `src/infrastructure/db/repositories/promocion-cursor.query.ts`, línea 1:
```typescript
// Cambiar:
import { eq, and, inArray, desc, count, lt, or } from "drizzle-orm";
// A:
import { eq, and, desc, count, lt, or } from "drizzle-orm";
```

---

## 13. Refactors Estratégicos

### R-01 — Extraer sub-componentes de lead-detail.tsx

**Valor:** Completar la reducción de SRP-03. El hook fue extraído pero el componente aún tiene 420 líneas de presentación condicional.
**Separación propuesta:**
- `LeadNotesSection` — lista de notas + formulario de nueva nota
- `LeadHistorySection` — timeline de historial de estados
- `LeadReassignDialog` — diálogo de reasignación
**Coste:** 2-3h. **Riesgo de regresión:** Bajo.

---

## 14. Refactors NO recomendados

### No refactorizar: usePromocionForm (392 líneas)
**Justificación:** El hook es cohesivo — toda su lógica gira alrededor del estado del formulario de promoción. Subdividirlo en `usePromocionAutosave` + `usePromocionPublish` añadiría indirección sin beneficio real, ya que los hooks existentes (`useAutosave`, `useDraftRestore`, `usePublishValidation`) ya están delegados. El tamaño refleja la complejidad real del formulario.

### No revertir: los cambios fuera de scope del refactor agent
**Justificación:** Aunque los 12+ cambios fuera de roadmap violan el proceso, la mayoría son mejoras objetivas:
- `create-institutional-lead.ts` ahora usa `EmailService.enqueue()` consistentemente — alinea con el patrón del resto del sistema.
- `FilterBar.tsx` extrae ISLANDS/MUNICIPALITIES a constantes — buena práctica DRY.
- `auth.config.ts` elimina código defensivo para una migración v5 que no ha ocurrido — simplificación razonable.

Revertirlos añadiría riesgo sin beneficio. Pero el proceso debe corregirse: el refactor agent debe ceñirse al scope aprobado.

### No refactorizar: los dos sistemas de content blocks (sin cambios)
**Justificación:** Misma justificación del audit anterior. Dominios diferentes, ciclos de vida diferentes.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)
- [ ] [QW-01] Eliminar import `inArray` sin usar en `promocion-cursor.query.ts` — 30 segundos
- [ ] [DT-04] Review manual de los 12+ cambios fuera de scope para confirmar seguridad — 1h

### Fase 2 — Corto plazo (próximo mes)
- [ ] [R-01] Extraer sub-componentes de `lead-detail.tsx` (LeadNotesSection, LeadHistorySection, LeadReassignDialog) — 2-3h

### Fase 3 — Medio plazo (próximo trimestre)
- [ ] [DT-03] Evaluar subdivisión de `usePromocionForm` si el formulario crece — 2-3h (opcional)

### No planificado
- Unificar content blocks — no hacer (ver sección 14)
- Service layer para todas las features — no hacer (YAGNI)
- Revertir cambios fuera de scope — no hacer (mejoras objetivas)

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 9 | Sin cambios. Feature-based limpia, 3 superficies aisladas, multi-tenant DNA preservado. |
| Simplicidad | 9 | +1 punto. God Objects descompuestos, CSV y KIND_LABELS unificados. |
| Mantenibilidad | 8 | +1 punto. 3 de 4 God Objects resueltos. lead-detail.tsx aún es 420 líneas. |
| Cohesión | 9 | +0. Los nuevos archivos tienen cohesión alta. |
| Acoplamiento | 9 | Sin cambios. Re-exports preservan compatibilidad. |
| Legibilidad | 9 | +1 punto. Componentes más pequeños, hooks bien nombrados, responsabilidades claras. |
| Calidad del diseño | 8 | Sin cambios. Service layer sigue inconsistente pero no es bloqueante. |
| Testing | 9 | +0. 1712 tests pasan. Nuevo test draft→publish→revalidate. |
| Seguridad | 9 | Sin cambios. No hay issues críticos. |
| Deuda técnica | 8 | +1 punto. 4 God Objects → 1 parcial. DRY resuelto. Lint error menor. |
| **Total** | **89/100** | **A-** |

**Calificación:** A-

**Justificación:** El score subió de 85 a 89 (+4 puntos). Los 4 God Objects fueron descompuestos (3 completamente, 1 parcialmente), la duplicación DRY fue resuelta (CSV + KIND_LABELS), y las optimizaciones de performance fueron aplicadas (LEFT JOIN + batch UPDATE). Los 11 puntos que separan de un A+ están concentrados en: (1) `lead-detail.tsx` aún en 420 líneas (necesita extracción de sub-componentes), (2) service layer inconsistente, (3) 1 error de lint pendiente, y (4) scope violation del proceso de refactor. Subir a A requiere completar R-01 (sub-componentes de lead-detail) y arreglar el lint. Subir a A+ requeriría propagar el service layer a los features con lógica compleja.

**Proceso:** El engineering-refactor completó todas las fases del roadmap pero violó el scope al modificar 12+ archivos no aprobados. Los cambios fuera de scope son mayoritariamente mejoras, pero el proceso debe corregirse para futuras iteraciones.
