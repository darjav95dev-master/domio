# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-13
> Estado: post-refactor completo (R-01 a R-04 + QW-01 a QW-05) + revert de cambios fuera de scope + R-01 final

---

## 1. Executive Summary

**Score:** 90 — **A-**

**Estado general:** Todos los refactors aprobados del roadmap han sido completados. Los 4 God Objects originales fueron descompuestos: `PromocionRepository` (559→374), `LeadRepository` (593→479), `promocion-form.tsx` (547→237), y `lead-detail.tsx` (507→230). La duplicación DRY fue resuelta (CSV + KIND_LABELS). Las optimizaciones de performance fueron aplicadas (LEFT JOIN + batch UPDATE). Los cambios fuera de scope del refactor agent fueron revertidos manualmente. El código está limpio: 182 test files (1707 tests) pasan, typecheck limpio, lint limpio. Lo que queda es deuda estructural menor que no justifica más refactors ahora.

**Fortalezas principales:**
- Multi-tenant DNA rigurosamente respetado — sin cambios en TenantContext, RLS, ni SET LOCAL.
- 4 God Objects descompuestos en componentes cohesivos con responsabilidades únicas.
- DRY resuelto: CSV escaping unificado, KIND_LABELS centralizado.
- Performance optimizado: LEFT JOIN en getUnreadCount, batch UPDATE en reorderGallery.
- Testing maduro: 1707 tests pasan,包括 nuevo test draft→publish→revalidate.
- Backward compatibility preservada con re-exports y wrappers.

**Riesgos principales:**
- Service layer inconsistente — solo `PromocionPublishService` y `ContentService` son services formales. No bloqueante.
- `usePromocionForm` (392 líneas) es un hook extenso pero cohesivo. Aceptable.
- Dos sistemas paralelos de content blocks con dominios diferentes. Aceptable.

---

## 2. Arquitectura

### Estado actual

```
app/(public)/         → Web pública comercial (SSR/ISR, PublicContext)
app/(auth)/panel/     → Backoffice (AuthenticatedContext, sesión JWT)
app/api/v1/           → API pública versionada (ApiKeyContext, rate limit)
app/api/internal/     → Endpoints del backoffice (requireAuth)

src/features/         → 14 módulos con hooks extraídos en leads/ y promociones/
src/infrastructure/   → DB (15 repositorios — 3 nuevos), auth, email, media,
                        rate-limiting, tenant, slug, observability
src/shared/           → Tipos, constantes, schemas, componentes, utils (+csv.ts)
```

### Archivos creados por el refactor (todos in-scope)

| Archivo | Líneas | Origen |
|---------|--------|--------|
| `src/infrastructure/db/repositories/promocion-cursor.query.ts` | 165 | R-01 — extraído de PromocionRepository |
| `src/infrastructure/db/repositories/promocion-history-recorder.ts` | 74 | R-01 — extraído de PromocionRepository |
| `src/infrastructure/db/repositories/lead-read-mark.repository.ts` | 142 | R-02 — extraído de LeadRepository |
| `src/shared/utils/csv.ts` | 30 | QW-02 — CSV escaping unificado |
| `src/features/leads/hooks/use-lead-detail.ts` | 148 | R-03 — hook extraído de lead-detail.tsx |
| `src/features/promociones/hooks/use-promocion-form.ts` | 392 | R-04 — hook extraído de promocion-form.tsx |
| `src/features/leads/components/lead-notes-section.tsx` | 136 | R-01 final — sub-componente de lead-detail |
| `src/features/leads/components/lead-history-section.tsx` | 99 | R-01 final — sub-componente de lead-detail |
| `src/features/leads/components/lead-reassign-dialog.tsx` | 112 | R-01 final — sub-componente de lead-detail |
| `tests/integration/promocion-publish-flow.test.ts` | — | Tests draft→publish→revalidate |

### Fortalezas
- Todas las fortalezas del audit original se preservan.
- SRP: los 4 God Objects completamente resueltos.
- DRY: CSV escaping y KIND_LABELS unificados.
- Performance: LEFT JOIN + batch UPDATE.
- Backward compatibility: re-exports y wrapper de FormData.

### Debilidades
- Service layer inconsistente (solo 2 de ~10 features tienen service formal).
- `usePromocionForm` (392 líneas) es extenso pero cohesivo.

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] PromocionRepository — RESUELTO ✅
559→374 líneas. Cursor pagination → `PromocionCursorQuery`, history → `PromocionHistoryRecorder`.

#### [SRP-02] LeadRepository — RESUELTO ✅
593→479 líneas. Read marks → `LeadReadMarkRepository` con LEFT JOIN.

#### [SRP-03] lead-detail.tsx — RESUELTO ✅
507→230 líneas. Hook `useLeadDetail` (148 líneas) + 3 sub-componentes: `LeadNotesSection` (136), `LeadHistorySection` (99), `LeadReassignDialog` (112).

#### [SRP-04] promocion-form.tsx — RESUELTO ✅
547→237 líneas. Hook `usePromocionForm` (392 líneas) extraído con toda la lógica.

### OCP, LSP, ISP, DIP — sin violaciones

---

## 4. YAGNI

Sin cambios. No se detectaron abstracciones o interfaces innecesarias.

---

## 5. KISS

`usePromocionForm` (392 líneas) es extenso pero cohesivo — los sub-hooks ya están delegados. No subdividir.

---

## 6. DRY

### RESUELTOS ✅
- **CSV escaping:** unificado en `src/shared/utils/csv.ts`.
- **KIND_LABELS:** centralizado en `domain-labels.ts`.

### Aceptables (no unificar)
- `withTransaction` boilerplate (inherente a Drizzle).
- Cursor pagination en 4 métodos (variaciones reales).
- `buildFilterConditions` en diferentes repositorios (duplicación incidental).

---

## 7. Code Smells

| # | Smell | Severidad | Estado |
|---|-------|-----------|--------|
| S1 | ~~PromocionRepository 559 líneas~~ | ~~Alta~~ | ✅ Resuelto |
| S2 | ~~LeadRepository 593 líneas~~ | ~~Alta~~ | ✅ Resuelto |
| S3 | ~~lead-detail.tsx 507 líneas~~ | ~~Alta~~ | ✅ Resuelto (230 líneas) |
| S4 | ~~promocion-form.tsx 547 líneas~~ | ~~Alta~~ | ✅ Resuelto |
| S5 | ~~CSV escaping duplicado~~ | ~~Media~~ | ✅ Resuelto |
| S6 | ~~KIND_LABELS duplicado~~ | ~~Media~~ | ✅ Resuelto |
| S7 | ~~reorderGallery N UPDATEs~~ | ~~Media~~ | ✅ Resuelto |
| S8 | ~~getUnreadCount subquery~~ | ~~Media~~ | ✅ Resuelto |
| S9 | Dos sistemas de content blocks | Media | Aceptable |
| S10 | CatalogRepository 580 líneas | Media | Aceptable |
| S11 | ~~import inArray sin usar~~ | ~~Baja~~ | ✅ Resuelto |
| S12 | ~~src/context/ vacío~~ | ~~Baja~~ | ✅ Resuelto |
| S13 | usePromocionForm 392 líneas | Baja | Aceptable |

**No hay smells de severidad Alta.** Todos los smells medios son aceptables (justificados en sección 14).

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
No hay deuda alta — todos los God Objects resueltos.

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | Service layer inconsistente — solo 2 de ~10 features tienen service | Posponer |
| DT-02 | Dos sistemas de content blocks con dominios diferentes | No hacer (aceptable) |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-03 | `usePromocionForm` (392 líneas) — evaluar subdivisión si crece | Opcional |
| DT-04 | CatalogRepository (580 líneas) — aceptable, cada método tiene responsabilidad clara | No hacer |

---

## 12. Quick Wins

No hay quick wins pendientes — todos los QW del roadmap fueron completados.

---

## 13. Refactors Estratégicos

No hay refactors estratégicos pendientes. Todos los aprobados (R-01 a R-04) han sido completados.

---

## 14. Refactors NO recomendados

### No refactorizar: usePromocionForm (392 líneas)
El hook es cohesivo — los sub-hooks ya están delegados. Subdividir añade indirección sin beneficio.

### No refactorizar: los dos sistemas de content blocks
Dominios diferentes, ciclos de vida diferentes.

### No refactorizar: CatalogRepository (580 líneas)
Cada método tiene responsabilidad clara con variaciones reales. No es un God Object.

### No refactorizar: withTransaction boilerplate
Inherente a Drizzle. Introducir abstracción añade indirección sin valor.

### No refactorizar: service layer para todas las features
YAGNI — solo tiene valor donde hay lógica de negocio compleja. PromocionPublishService y ContentService son suficientes.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)
Sin tareas pendientes — todos los QW completados.

### Fase 2 — Corto plazo (próximo mes)
Sin tareas pendientes — R-01 completado.

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
| Mantenibilidad | 9 | +1 punto. Los 4 God Objects completamente resueltos. lead-detail.tsx 230 líneas. |
| Cohesión | 9 | Nuevos archivos con cohesión alta |
| Acoplamiento | 9 | Re-exports y wrapper preservan compatibilidad |
| Legibilidad | 9 | Componentes pequeños, hooks bien nombrados, sub-componentes claros |
| Calidad del diseño | 8 | Service layer inconsistente pero no bloqueante |
| Testing | 9 | 1707 tests pasan. Test draft→publish→revalidate añadido |
| Seguridad | 9 | Sin issues críticos |
| Deuda técnica | 9 | +1 punto. Sin deuda alta. Solo deuda estructural aceptable |
| **Total** | **90/100** | **A-** |

**Calificación:** A-

**Justificación:** El score subió de 85 a 90 (+5 puntos) tras completar todos los refactors aprobados. Los 4 God Objects fueron descompuestos, la duplicación DRY fue resuelta, las optimizaciones de performance fueron aplicadas, y los cambios fuera de scope fueron revertidos. Los 10 puntos que separan de un A+ son deuda estructural que no justifica más refactors ahora: service layer inconsistente (YAGNI — solo tiene valor donde hay lógica compleja), dos sistemas de content blocks (dominios diferentes), y CatalogRepository (580 líneas con variaciones reales). El proyecto está en su mejor estado técnico.
