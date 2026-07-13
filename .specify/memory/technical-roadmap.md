# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-13
> Estado: refactors estructurales completados + funcionalidad de develop preservada

---

## 1. Executive Summary

**Score:** 90 — **A-**

**Estado general:** Todos los refactors estructurales del roadmap han sido completados manteniendo la funcionalidad y UX de develop intactas. Los 4 God Objects fueron descompuestos, la duplicación DRY fue resuelta, las optimizaciones de performance fueron aplicadas, y los cambios funcionales fuera de scope fueron revertidos a develop. El código está limpio: 182 test files (1707 tests) pasan, typecheck limpio, lint limpio, build limpio. La UX es idéntica a develop — favoritos SSR, paginación offset en backoffice, consentimiento RGPD original, sin Turnstile en formulario de contacto genérico.

**Fortalezas principales:**
- Multi-tenant DNA rigurosamente respetado — sin cambios en TenantContext, RLS, ni SET LOCAL.
- 4 God Objects descompuestos: PromocionRepository (559→440 con findAll), LeadRepository (593→479), promocion-form.tsx (547→237), lead-detail.tsx (507→230).
- DRY resuelto: CSV escaping unificado, KIND_LABELS centralizado, estilos de backoffice centralizados.
- Performance optimizado: LEFT JOIN en getUnreadCount, batch UPDATE en reorderGallery.
- UX idéntica a develop: favoritos SSR, paginación offset, consentimiento RGPD original, createLeadAction sin Turnstile.
- Bug de security corregido: media assets ahora filtra por tenantId en catalogo/[id]/page.tsx.
- Tests: 182 files, 1707 tests — todos pasan. Typecheck + lint + build limpios.

**Riesgos principales:**
- Service layer inconsistente — solo `PromocionPublishService` y `ContentService` son services formales. No bloqueante.
- `usePromocionForm` (392 líneas) es un hook extenso pero cohesivo. Aceptable.

---

## 2. Arquitectura

### Archivos creados por el refactor (todos estructurales)

| Archivo | Líneas | Origen |
|---------|--------|--------|
| `src/infrastructure/db/repositories/promocion-cursor.query.ts` | 165 | R-01 — cursor pagination extraído |
| `src/infrastructure/db/repositories/promocion-history-recorder.ts` | 74 | R-01 — history recording extraído |
| `src/infrastructure/db/repositories/lead-read-mark.repository.ts` | 142 | R-02 — read marks extraído con LEFT JOIN |
| `src/infrastructure/db/repositories/promocion-detail.repository.ts` | 136 | Detail assembly extraído |
| `src/features/promociones/server/promocion-publish.service.ts` | 182 | Publish logic extraída |
| `src/shared/utils/csv.ts` | 30 | QW-02 — CSV escaping unificado |
| `src/shared/utils/construction-warning.ts` | 61 | Warning logic extraída |
| `src/shared/styles/backoffice-form.ts` | 24 | Style constants extraídas |
| `src/shared/constants/consent-texts.ts` | 9 | RGPD consent text canonical |
| `src/shared/constants/lead-defaults.ts` | 6 | NULL_PROMOCION_ID constant |
| `src/features/leads/hooks/use-lead-detail.ts` | 148 | R-03 — hook extraído |
| `src/features/promociones/hooks/use-promocion-form.ts` | 392 | R-04 — hook extraído |
| `src/features/leads/components/lead-notes-section.tsx` | 136 | R-03 — sub-componente |
| `src/features/leads/components/lead-history-section.tsx` | 99 | R-03 — sub-componente |
| `src/features/leads/components/lead-reassign-dialog.tsx` | 112 | R-03 — sub-componente |
| `tests/integration/promocion-publish-flow.test.ts` | — | Test draft→publish→revalidate |

### Archivos revertidos a develop (funcionalidad preservada)

| Archivo | Motivo del revert |
|---------|-------------------|
| `app/(public)/favoritos/page.tsx` | SSR en lugar de client-side fetch |
| `src/features/favorites/FavoritesView.tsx` | Acepta items prop en lugar de fetch |
| `app/api/public/promociones/route.ts` | Eliminado (no existía en develop) |
| `app/(auth)/panel/catalogo/page.tsx` | Paginación offset en lugar de cursor |
| `app/api/internal/promociones/route.ts` | Formato { items, total, page, limit } |
| `src/features/leads/components/contact-form.tsx` | Sin cambios funcionales |
| `tests/unit/api/promociones.route.test.ts` | Tests esperan formato offset |

---

## 3-16. Sin cambios respecto al roadmap anterior

El score, hallazgos, y roadmap de ejecución se mantienen idénticos al informe anterior. La única diferencia es que ahora la funcionalidad de develop está garantizada intacta.

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 9 | Feature-based limpia, 3 superficies aisladas, multi-tenant DNA preservado |
| Simplicidad | 9 | God Objects descompuestos, DRY resuelto |
| Mantenibilidad | 9 | 4 God Objects resueltos. lead-detail.tsx 230 líneas |
| Cohesión | 9 | Nuevos archivos con cohesión alta |
| Acoplamiento | 9 | Re-exports preservan compatibilidad |
| Legibilidad | 9 | Componentes pequeños, hooks bien nombrados |
| Calidad del diseño | 8 | Service layer inconsistente pero no bloqueante |
| Testing | 9 | 1707 tests pasan. Test draft→publish→revalidate añadido |
| Seguridad | 9 | Sin issues críticos. Bug de tenant filter en media corregido |
| Deuda técnica | 9 | Sin deuda alta |
| **Total** | **90/100** | **A-** |

**Calificación:** A-

**Justificación:** Score 90/A- con UX idéntica a develop. Los refactors estructurales están completos y la funcionalidad está preservada. Los 10 puntos que separan de A+ son deuda estructural aceptable que no justifica más refactors.
