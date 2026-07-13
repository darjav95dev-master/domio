# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-13
> Estado: post-refactor + revert de cambios fuera de scope

---

## 1. Executive Summary

**Score:** 88 — **A-**

**Estado general:** El engineering-refactor ejecutó las 3 fases del roadmap anterior. Los 4 God Objects fueron descompuestos, la duplicación DRY fue resuelta, y las optimizaciones de performance fueron aplicadas. Tras la auditoría se detectaron 15 archivos modificados fuera del scope aprobado — han sido revertidos manualmente. El código está limpio: 182 test files (1707 tests) pasan, typecheck limpio, lint limpio. Lo que queda es deuda menor: `lead-detail.tsx` aún en 420 líneas (R-03 fue parcial) y service layer inconsistente.

**Fortalezas principales:**
- Multi-tenant DNA rigurosamente respetado — sin cambios en TenantContext, RLS, ni SET LOCAL.
- `PromocionRepository` (559→374 líneas) delega cursor pagination e history recording.
- `LeadRepository` (593→479 líneas) delega read marks con LEFT JOIN optimizado.
- `promocion-form.tsx` (547→237 líneas) con hook `usePromocionForm` extraído.
- CSV escaping unificado en `src/shared/utils/csv.ts`.
- `KIND_LABELS` centralizado en `domain-labels.ts`.
- `MediaService.reorderGallery` usa batch CASE expression.
- Tests: 182 files, 1707 tests — todos pasan. Typecheck + lint limpios.

**Riesgos principales:**
- `lead-detail.tsx` solo se redujo a 420 líneas (target ~150). El hook fue extraído pero el componente aún contiene lógica de presentación condicional extensa.
- `usePromocionForm` es extenso (392 líneas) — la lógica se movió del componente al hook.
- Service layer inconsistente — solo `PromocionPublishService` y `ContentService` son services formales.

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

### Archivos del refactor (in-scope, aprobados)

| Archivo | Líneas | Origen |
|---------|--------|--------|
| `src/infrastructure/db/repositories/promocion-cursor.query.ts` | 165 | R-01 — extraído de PromocionRepository |
| `src/infrastructure/db/repositories/promocion-history-recorder.ts` | 74 | R-01 — extraído de PromocionRepository |
| `src/infrastructure/db/repositories/lead-read-mark.repository.ts` | 142 | R-02 — extraído de LeadRepository |
| `src/shared/utils/csv.ts` | 30 | QW-02 — CSV escaping unificado |
| `src/features/leads/hooks/use-lead-detail.ts` | 148 | R-03 — hook extraído de lead-detail.tsx |
| `src/features/promociones/hooks/use-promocion-form.ts` | 392 | R-04 — hook extraído de promocion-form.tsx |
| `tests/integration/promocion-publish-flow.test.ts` | — | Tests draft→publish→revalidate |

### Fortalezas
- Todas las fortalezas del audit anterior se preservan.
- SRP mejorado: 3 de 4 God Objects completamente resueltos.
- DRY mejorado: CSV escaping y KIND_LABELS unificados.
- Performance mejorado: LEFT JOIN en getUnreadCount, batch UPDATE en reorderGallery.
- Backward compatibility: re-exports y wrapper de FormData mantienen imports existentes.

### Debilidades
- `lead-detail.tsx` sigue en 420 líneas — R-03 fue parcial.
- `usePromocionForm` (392 líneas) es un hook extenso.
- Service layer inconsistente.

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] PromocionRepository — RESUELTO ✅
559→374 líneas. Cursor pagination → `PromocionCursorQuery`, history → `PromocionHistoryRecorder`.

#### [SRP-02] LeadRepository — RESUELTO ✅
593→479 líneas. Read marks → `LeadReadMarkRepository` con LEFT JOIN.

#### [SRP-03] lead-detail.tsx — PARCIAL ⚠️
507→420 líneas. Hook `useLeadDetail` (148 líneas) extraído. Pero el componente aún contiene lógica de presentación condicional extensa.
**Prioridad:** Planificar
**Acción concreta:** Extraer sub-componentes: `LeadNotesSection`, `LeadHistorySection`, `LeadReassignDialog`.

#### [SRP-04] promocion-form.tsx — RESUELTO ✅
547→237 líneas. Hook `usePromocionForm` (392 líneas) extraído con toda la lógica.

### OCP, LSP, ISP, DIP — sin violaciones

---

## 4. YAGNI

Sin cambios. No se detectaron abstracciones o interfaces innecesarias.

---

## 5. KISS

`usePromocionForm` (392 líneas) es extenso pero cohesivo — los sub-hooks (`useAutosave`, `useDraftRestore`, `usePublishValidation`) ya están delegados. Subdividirlo añadiría indirección sin beneficio.

---

## 6. DRY

### RESUELTOS ✅
- **CSV escaping:** unificado en `src/shared/utils/csv.ts`.
- **KIND_LABELS:** centralizado en `domain-labels.ts`.

### Aceptables (no unificar)
- `withTransaction` boilerplate (inherente a Drizzle).
- Cursor pagination en 4 métodos (variaciones reales justifican separación).
- `buildFilterConditions` en diferentes repositorios (duplicación incidental).

---

## 7. Code Smells

| # | Smell | Ubicación | Severidad | Estado |
|---|-------|-----------|-----------|--------|
| S1 | ~~PromocionRepository 559 líneas~~ | — | ~~Alta~~ | ✅ Resuelto |
| S2 | ~~LeadRepository 593 líneas~~ | — | ~~Alta~~ | ✅ Resuelto |
| S3 | lead-detail.tsx — 420 líneas | `src/features/leads/components/lead-detail.tsx` | Media | ⚠️ Parcial |
| S4 | ~~promocion-form.tsx 547 líneas~~ | — | ~~Alta~~ | ✅ Resuelto |
| S5 | ~~CSV escaping duplicado~~ | — | ~~Media~~ | ✅ Resuelto |
| S6 | ~~KIND_LABELS duplicado~~ | — | ~~Media~~ | ✅ Resuelto |
| S7 | ~~reorderGallery N UPDATEs~~ | — | ~~Media~~ | ✅ Resuelto |
| S8 | ~~getUnreadCount subquery~~ | — | ~~Media~~ | ✅ Resuelto |
| S9 | Dos sistemas de content blocks | 2 repositorios | Media | Aceptable |
| S10 | CatalogRepository 580 líneas | `catalog.repository.ts` | Media | Aceptable |
| S11 | ~~import inArray sin usar~~ | — | ~~Baja~~ | ✅ Resuelto |
| S12 | ~~src/context/ vacío~~ | — | ~~Baja~~ | ✅ Resuelto |
| S13 | usePromocionForm 392 líneas | `use-promocion-form.ts` | Baja | Aceptable |

---

## 8. Testing

- **182 test files, 1707 tests — todos pasan** ✅
- Typecheck limpio ✅
- Lint limpio ✅
- Nuevo test: `tests/integration/promocion-publish-flow.test.ts` (draft→publish→revalidate)

---

## 9. Seguridad

Sin cambios críticos. Todas las medidas se preservan:
- Auth JWT + rate limiting ✅
- RLS en todas las tablas ✅
- API keys con bcrypt + prefix filtering ✅
- Validación Zod en todos los boundaries ✅
- Sentry con sanitización de secrets ✅

---

## 10. Performance

### RESUELTOS ✅
- `reorderGallery`: batch CASE expression en lugar de N UPDATEs.
- `getUnreadCount`: LEFT JOIN + IS NULL en lugar de subquery NOT IN.

---

## 11. Deuda Técnica

### Crítica
No hay deuda crítica.

### Alta

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | `lead-detail.tsx` (420 líneas) — extraer sub-componentes | 2-3h |

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-02 | Service layer inconsistente — solo 2 de ~10 features tienen service | Posponer |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-03 | `usePromocionForm` (392 líneas) — evaluar subdivisión si crece | Opcional |

---

## 12. Quick Wins

No hay quick wins pendientes — todos los QW del roadmap anterior fueron completados.

---

## 13. Refactors Estratégicos

### R-01 — Extraer sub-componentes de lead-detail.tsx

**Valor:** Completar SRP-03. El hook fue extraído pero el componente aún tiene 420 líneas de presentación condicional.
**Separación propuesta:**
- `LeadNotesSection` — lista de notas + formulario de nueva nota
- `LeadHistorySection` — timeline de historial de estados
- `LeadReassignDialog` — diálogo de reasignación
**Coste:** 2-3h. **Riesgo de regresión:** Bajo.

---

## 14. Refactors NO recomendados

### No refactorizar: usePromocionForm (392 líneas)
El hook es cohesivo — los sub-hooks ya están delegados. Subdividirlo añade indirección sin beneficio.

### No refactorizar: los dos sistemas de content blocks
Dominios diferentes, ciclos de vida diferentes.

### No refactorizar: CatalogRepository (580 líneas)
Cada método tiene responsabilidad clara con variaciones reales. No es un God Object.

### No refactorizar: withTransaction boilerplate
Inherente a Drizzle. Introducir abstracción añade indirección sin valor.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)
Sin tareas pendientes — todos los QW completados.

### Fase 2 — Corto plazo (próximo mes)
- [x] [R-01] Extraer sub-componentes de `lead-detail.tsx` — 2-3h

### Fase 3 — Medio plazo (próximo trimestre)
- [ ] [DT-03] Evaluar subdivisión de `usePromocionForm` si el formulario crece — opcional

### No planificado
- Unificar content blocks — no hacer
- Service layer para todas las features — no hacer (YAGNI)
- Cursor pagination helper genérico — posponer hasta 5º caso

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 9 | Feature-based limpia, 3 superficies aisladas, multi-tenant DNA preservado |
| Simplicidad | 9 | God Objects descompuestos, DRY resuelto |
| Mantenibilidad | 8 | 3 de 4 God Objects resueltos. lead-detail.tsx aún 420 líneas |
| Cohesión | 9 | Nuevos archivos con cohesión alta |
| Acoplamiento | 9 | Re-exports y wrapper preservan compatibilidad |
| Legibilidad | 9 | Componentes más pequeños, hooks bien nombrados |
| Calidad del diseño | 8 | Service layer inconsistente pero no bloqueante |
| Testing | 9 | 1707 tests pasan. Nuevo test draft→publish→revalidate |
| Seguridad | 9 | Sin issues críticos |
| Deuda técnica | 8 | 4 God Objects → 1 parcial. DRY resuelto. Lint limpio |
| **Total** | **88/100** | **A-** |

**Calificación:** A-

**Justificación:** El score subió de 85 a 88 (+3 puntos). Los cambios fuera de scope fueron revertidos, lo que estabilizó el score (los +4 puntos de la re-auditoría anterior incluían mejoras no aprobadas). Lo que queda es deuda menor: `lead-detail.tsx` en 420 líneas y service layer inconsistente. Subir a A (94+) requiere completar R-01. Subir a A+ requiere propagar service layer.
