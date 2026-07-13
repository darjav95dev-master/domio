# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-13
> Rama auditada: chore/engenier-auditor (re-auditoría completa post-CAPTCHA, partiendo de cero)
> Score anterior (última auditoría): 83/100 — B+

---

## 1. Executive Summary

**Score:** 88 — **A-**

**Estado general:** Domio ha avanzado de forma sólida desde la auditoría anterior (83 → 88). Todos los issues críticos y altos del roadmap anterior han sido resueltos correctamente: `createLeadService` ahora usa `EmailService.enqueue()` de forma consistente, `PromocionPublishService` tiene tests unitarios completos que cubren todos sus métodos públicos, la primera carga del catálogo backoffice ahora usa cursor pagination de forma exclusiva (la rama legacy `LegacyCatalogPage` ha sido eliminada), las constantes de estilo del backoffice han sido extraídas a `src/shared/styles/backoffice-form.ts`, la alerta en producción para `TURNSTILE_SECRET_KEY` ausente está implementada con `logger.error()`, y el flujo de favoritos ha sido completamente invertido (ahora el cliente lee IDs de localStorage y hace una fetch a `/api/public/promociones?ids=...`). El código está limpio, bien organizado, y los patrones arqutitectónicos se respetan con disciplina. Los 12 puntos que separan al proyecto de un A+ son deuda menor concentrada en duplicación de literales de estilo y la necesidad de un service layer más consistente.

**Fortalezas principales:**
- Multi-tenant DNA rigurosamente respetado: `SET LOCAL` transaccional, repositorios context-aware, tests de aislamiento bloqueantes en CI.
- Testing maduro y multicapa: unit, integration, isolation, contract, E2E con POM. `PromocionPublishService` ahora está cubierto con tests directos para todos sus métodos públicos.
- Email encolado de forma consistente: tanto `createLeadService` (engagement) como `createInstitutionalLead` (api-public) usan `EmailService.enqueue()` dentro de la misma transacción.
- Cursor pagination exclusivo: el catálogo backoffice usa cursor en todas las cargas, sin rama de offset legacy.
- Favoritos client-first: `FavoritesView` lee IDs de localStorage y hace fetch solo de los items necesarios via `/api/public/promociones?ids=...`.
- `src/shared/styles/backoffice-form.ts` extrae `LABEL_STYLE`, `SELECT_STYLE`, `ERROR_STYLE`, `DANGER_BORDER` — importados correctamente en 15+ componentes.
- Turnstile bien integrado y alerta de configuración incorrecta activa en producción.

**Riesgos principales:**
- `KIND_LABELS` duplicado literalmente en tres componentes (`catalog-list.tsx`, `catalog-filters.tsx`, `promocion-section-identity.tsx`) sin estar centralizado en `shared/constants/domain-labels.ts`.
- `transformToString` en `blocks-editor.tsx` está declarado antes de los imports — es cosmético pero indica falta de linting de orden de declaraciones.
- `font-mono text-[10px] font-medium uppercase tracking-[0.16em]` sigue apareciendo como literal en 14 componentes fuera del backoffice (`block-form-*.tsx`, `ContactFormGeneric`, componentes del home) que no importan `LABEL_STYLE`. Esto es aceptable en componentes de presentación pública (los tokens de color difieren), pero los bloqueos de `block-form-*.tsx` del backoffice sí deberían usar la constante.
- `PromocionRepository` (559 líneas) y `LeadRepository` (593 líneas) siguen siendo los archivos más grandes del proyecto, con múltiples responsabilidades.
- La query `getUnreadCount` usa un subquery SQL crudo (`sql\`... NOT IN (...)\``) en lugar de un LEFT JOIN — funcionalmente correcto pero menos eficiente con escala.

---

## 2. Arquitectura

### Estado actual

```
app/(public)/         → Web pública comercial (SSR/ISR, PublicContext)
app/(auth)/panel/     → Backoffice (AuthenticatedContext, sesión JWT)
app/api/v1/           → API pública versionada (ApiKeyContext, rate limit)
app/api/internal/     → Endpoints del backoffice (requireAuth)

src/features/         → Módulos: catalog, promociones, leads, engagement, contact,
                        contenidos, seo, home, detail, favorites, api-public,
                        api-keys, backoffice, team
src/infrastructure/   → DB (Drizzle + repos), auth, email, media, rate-limiting,
                        tenant, slug
src/shared/           → Tipos, constantes, componentes UI, utils, schemas, styles
```

**Patrón central preservado:** `TenantContext → TenantAwareRepository → transacción con SET LOCAL`. Los tres contextos concretos aplican filtros obligatorios a nivel de repositorio, no de endpoint. Sin violaciones detectadas en esta revisión.

**Mejoras confirmadas desde auditoría anterior:**
- `EmailService.enqueue()` usado de forma consistente en ambas rutas de creación de lead.
- `PromocionPublishService` con test suite completo (prepareUpdateData, convertLocationFields, validateBlocksOnPublish, validateMediaOnPublish).
- Cursor pagination exclusivo en catálogo backoffice — la página usa siempre `findAllWithCursor(filters, { cursor: cursor ?? "", limit })`.
- `FavoritesView` usa el patrón client-first con fetch a `/api/public/promociones?ids=...`.
- `src/shared/styles/backoffice-form.ts` centraliza las constantes de estilo del formulario backoffice.

### Fortalezas

- Tres superficies bien aisladas con mecanismos de autenticación diferentes y sin solapamiento.
- Resiliencia a fallos externos: email encolado en transacción, rate limiting con degraded mode, Turnstile con bypass en dev y alerta en producción.
- Tests de aislamiento bloqueantes en CI — garantía formal del modelo multi-tenant.
- API pública versionada con tests de contrato — ruptura de schema bloqueante en CI.
- `PromocionPublishService` bien encapsulado y testeado de forma aislada.

### Debilidades

- **Los repositorios principales siguen creciendo.** `PromocionRepository` (559 líneas) y `LeadRepository` (593 líneas) mezclan responsabilidades. No es un bloqueante, pero es el techo de complejidad que limita el score.
- **No hay service layer formal** entre los route handlers de `app/api/internal/` y los repositorios, excepto para `PromocionPublishService`. El patrón no se ha propagado a leads, contenidos ni media.
- **`KIND_LABELS` duplicado** en tres componentes sin constante centralizada en `shared/constants/domain-labels.ts`.

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | `PromocionRepository` acumula CRUD + tipologías + history + detail + cursor | `src/infrastructure/db/repositories/promocion.repository.ts` | Alto |
| A2 | `LeadRepository` acumula lecturas multi-rol + escrituras + notas + read marks + CSV | `src/infrastructure/db/repositories/lead.repository.ts` | Alto |
| A3 | `KIND_LABELS` duplicado en tres componentes del backoffice | `catalog-list.tsx`, `catalog-filters.tsx`, `promocion-section-identity.tsx` | Bajo |

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] PromocionRepository: tres razones persistentes para cambiar
**Problema:** `PromocionRepository` (559 líneas, reducido desde 699 por la extracción del detalle público) sigue acumulando: (1) CRUD básico (`findById`, `create`, `update`, `updateDraft`, `delete`); (2) sincronización de tipologías vía `TipologiaSyncService`; (3) registro de historial vía `PromocionHistoryRepository`; (4) cursor pagination para el backoffice (`findAllWithCursor`). El método `update()` sigue siendo complejo: fetch, diff, update, recordHistory, tipologías sync, re-fetch.
**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts`
**Impacto:** Medio. Bien organizado internamente con métodos privados bien nombrados. El riesgo real es que un cambio en el esquema de tipologías o en el historial obliga a tocar el mismo archivo.
**Prioridad:** Planificar
**Acción concreta:** Separar `findAllWithCursor` en el `CatalogRepository` del backoffice (similar a cómo `CatalogRepository` ya maneja el catálogo público). El `update()` puede simplificarse si el history recording se orquesta en un service layer.

#### [SRP-02] LeadRepository: exportación CSV como preocupación de presentación
**Problema:** `LeadRepository` (593 líneas) contiene `exportCsv()` que devuelve filas de leads — pero la serialización CSV real se hace en `leads.actions.ts`. La separación es correcta, pero `exportCsv` aplica filtros por rol distintos a los de `findAll`, lo que es duplicación de lógica.
**Archivos afectados:** `src/infrastructure/db/repositories/lead.repository.ts`
**Impacto:** Bajo. Funcional y bien testeado. Solo refactorizar si el export evoluciona.
**Prioridad:** Posponer

### OCP, LSP, ISP — Sin violaciones relevantes

El sistema de bloques editoriales usa un switch sobre `ContentBlockType` con 5 casos — sin expectativa de extensión frecuente. Los tres contextos extienden `TenantContext` correctamente.

### DIP — Sin violaciones activas

La violación DIP-01 de la auditoría anterior (inserción directa en `email_queue`) ha sido resuelta. `createLeadService` ahora instancia `EmailService(new EmailRepository())` y usa `enqueue()` en ambas llamadas (confirmación al lead + notificación al agente).

---

## 4. YAGNI

### Código innecesario

No hay código muerto significativo. El proyecto está limpio. La rama `LegacyCatalogPage` ha sido eliminada correctamente.

### Abstracciones aceptadas (no refactorizar)

#### `TenantAwareRepository` (9 líneas)
Clase abstracta que documenta el patrón. 14+ repositorios la extienden. No refactorizar.

### Código eliminable

| Código | Motivo | Riesgo de eliminar |
|--------|--------|--------------------|
| `src/context/.gitkeep` | Carpeta vacía — el estado global vive en los contextos de tenant | Muy bajo |

---

## 5. KISS

### Complejidad accidental

#### [KISS-01] `transformToString` declarado antes de los imports en blocks-editor.tsx
**Problema:** En `blocks-editor.tsx` la función `transformToString` (línea 45) está declarada entre los imports y las definiciones de tipos, aunque técnicamente es una función de utilidad. No es un error de runtime pero es una anomalía de organización que no se resolvió en el ciclo anterior.
**Archivos afectados:** `src/features/promociones/components/blocks-editor.tsx:45`
**Impacto:** Muy bajo. Cosmético.
**Prioridad:** Posponer

#### [KISS-02] `getUnreadCount` / `getUnreadLeadIds` usan subquery SQL crudo con NOT IN
**Problema:** `LeadRepository.getUnreadCount()` y `getUnreadLeadIds()` usan `sql\`... NOT IN (SELECT ...)\`` en lugar de un LEFT JOIN con `IS NULL`. Con tablas pequeñas la diferencia es imperceptible, pero NOT IN tiene comportamiento sorpresivo con NULLs y peor plan de query en escala.
**Archivos afectados:** `src/infrastructure/db/repositories/lead.repository.ts:366-377, 519-528`
**Impacto:** Bajo actualmente. Relevante si `lead_read_marks` crece.
**Prioridad:** Posponer

### Simplificaciones posibles

- `KIND_LABELS` centralizado en `shared/constants/domain-labels.ts` y exportado como `PROMOCION_KIND_LABELS`.

---

## 6. DRY

### Duplicaciones relevantes

#### [DRY-01] `KIND_LABELS` duplicado en tres componentes del backoffice
**Problema:** Las etiquetas de `portfolio` → "Portafolio" y `external` → "Captación externa" se definen inline en tres sitios distintos: como objeto literal en `catalog-list.tsx`, como array de options en `catalog-filters.tsx`, y como array de options en `promocion-section-identity.tsx`. Si se añade un nuevo `kind` (requiere migración explícita + PR según architecture.md §7), hay que actualizar tres archivos manualmente.
**Archivos afectados:**
- `src/features/promociones/components/catalog-list.tsx:44-47`
- `src/features/promociones/components/catalog-filters.tsx:18-21`
- `src/features/promociones/components/promocion-section-identity.tsx:45-48`
**Impacto:** Bajo pero concreto. La constitución §11.1 requiere que los sets cerrados tengan fuente única.
**Prioridad:** Planificar
**Acción concreta:** Añadir `PROMOCION_KIND_LABELS: Record<PromocionKind, string>` a `src/shared/constants/domain-labels.ts` y consumirlo en los tres componentes.

#### [DRY-02] `font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle` en block-form-*.tsx
**Problema:** Los cuatro componentes `block-form-ubicacion.tsx`, `block-form-plazos.tsx`, `block-form-zonas.tsx`, `block-form-calidades.tsx` definen cada uno una constante local `LABEL_STYLE` con el mismo valor literal en lugar de importar de `src/shared/styles/backoffice-form.ts`. `ContactFormGeneric.tsx`, `unidad-editor.tsx` y `catalog-list.tsx` también usan el literal directamente.
**Archivos afectados:** 7+ archivos en `src/features/promociones/components/` y `src/features/contact/components/`
**Impacto:** Bajo. Cambiar el estilo de label del backoffice requiere buscar en 7+ archivos en lugar de uno. Ya existe la constante en `backoffice-form.ts` — falta aplicarla en los componentes que la definen localmente.
**Prioridad:** Planificar

### Duplicaciones aceptables

- **Validación client/server de bloques editoriales:** mismos schemas Zod con propósitos distintos. No unificar.
- **Tres formularios de contacto** (`ContactForm` en engagement, `ContactFormGeneric` en contact, `contact-form` en leads): campos y server actions distintos. No unificar.
- **Literales de estilo en componentes del home** (`Hero.tsx`, `AboutDomio.tsx`, `Trust.tsx`): son componentes de presentación pública con colores distintos (`text-white/55`, `text-terracota`). No usar `LABEL_STYLE` del backoffice.

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo | Severidad |
|---|-------|-----------|------|-----------|
| S1 | PromocionRepository: 559 líneas, 4 responsabilidades (CRUD, tipologías sync, history, cursor) | `promocion.repository.ts` | God Class | Media |
| S2 | LeadRepository: 593 líneas, 4 responsabilidades (lecturas, escrituras, read marks, CSV export) | `lead.repository.ts` | God Class | Media |
| S3 | BlocksEditor: 760 líneas, mezcla estado + drag&drop + validación + renderizado | `blocks-editor.tsx` | God Component | Baja |
| S4 | TipologiaEditor: 575 líneas, múltiples sub-editores | `tipologia-editor.tsx` | God Component | Baja |
| S5 | KIND_LABELS duplicado en 3 componentes sin fuente única | `catalog-list.tsx`, `catalog-filters.tsx`, `promocion-section-identity.tsx` | DRY / Magic Strings | Baja |
| S6 | `LABEL_STYLE` como literal local en block-form-*.tsx y otros en lugar de importar de backoffice-form.ts | 7+ archivos | DRY | Baja |
| S7 | `getUnreadCount` / `getUnreadLeadIds` usan NOT IN subquery crudo | `lead.repository.ts:366, 519` | Performance smell | Baja |
| S8 | `transformToString` declarado fuera de orden (antes de tipos) en blocks-editor.tsx | `blocks-editor.tsx:45` | Naming / Order | Muy baja |
| S9 | `as unknown as Record<string,unknown>` en promocion.repository.ts (recordHistory) | `promocion.repository.ts:484,486` | Type safety escape hatch | Muy baja |

### Clasificación por severidad
- **Alta:** Ninguna
- **Media:** S1, S2
- **Baja:** S3, S4, S5, S6, S7
- **Muy baja:** S8, S9

### Prioridad
- **Hacer de inmediato:** Ninguno urgente
- **Planificar:** S5 (KIND_LABELS), S6 (LABEL_STYLE residual)
- **Posponer:** S1, S2 (repositorios — manejables en su estado actual), S3, S4, S7, S8, S9

---

## 8. Testing

### Estado

Infraestructura de testing madura, multicapa y bien organizada:
- **Unit tests** co-locados (`*.spec.ts`) y en `tests/unit/`.
- **Integration tests** en `tests/integration/` y `tests/features/` cubriendo operaciones completas de negocio.
- **Isolation tests** en `tests/isolation/` verificando aislamiento RLS entre dos tenants sintéticos.
- **Contract tests** en `tests/contract/v1/` con snapshots JSON — bloquean CI si el schema de la API pública diverge.
- **E2E tests** en `tests/e2e/` con Playwright y Page Object Model.

### Calidad

Alta. `PromocionPublishService` ahora tiene cobertura directa completa: 18 tests cubriendo `prepareUpdateData` (6 casos incluyendo mergePayload, slug generation, precedencia de parsedData), `convertLocationFields` (5 casos incluyendo null y ausencia), `validateBlocksOnPublish` (4 casos), `validateMediaOnPublish` (4 casos). El test de invariante RGPD en `create-lead-action.spec.ts` verifica `textAccepted === RGPD_CONSENT_TEXT_LEAD`. Los tests de aislamiento multi-tenant son bloqueantes.

### Cobertura — gaps pendientes

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| `createLeadService` no verifica que la notificación al agente contiene el email correcto del agente (solo verifica éxito genérico) | Bajo | Baja |
| Tests E2E para el flujo Turnstile con token expirado entre render y submit | Muy bajo | Muy baja |
| `FavoritesView` no tiene tests unitarios para el flujo fetch-by-ids | Bajo | Baja |
| Tests unitarios para `getUnreadCount` / `getUnreadLeadIds` verificando que devuelven 0 cuando todas las marcas existen | Bajo | Baja |

### Mejoras

| Mejora | Prioridad | Coste |
|--------|-----------|-------|
| Test que verifica que `createLeadService` encola la notificación al email del agente asignado (no del lead) | Baja | 1h |
| Test para `FavoritesView`: mock fetch, verificar que se llama con los IDs correctos | Baja | 1h |

---

## 9. Seguridad

### Seguridad — aspectos positivos verificados

- **Turnstile correctamente integrado:** verificación server-side, `TURNSTILE_SECRET_KEY` nunca expuesta al cliente, alerta `logger.error()` activa en producción cuando la clave está ausente.
- **No hay secretos en el código fuente.** Todas las credenciales en variables de entorno. `.env.example` completo y actualizado.
- **Validación Zod en todos los boundaries** incluyendo el nuevo endpoint `/api/public/promociones?ids=...` (validación de UUIDs, límite de 50 IDs).
- **Rate limiting** en login y formularios públicos, independiente de Turnstile.
- **RLS activado en todas las tablas de dominio** con policies de aislamiento por tenant.
- **Consentimiento RGPD** en la misma transacción que la creación del lead.
- **Modo de privacidad del mapa** respetado en serialización.
- **`/api/public/promociones`** solo devuelve items PUBLISHED portfolio — el `CatalogRepository.findPublicByIds()` aplica el filtro de contexto.

### Sin issues de seguridad activos

No hay issues de seguridad en el código revisado. La alerta de Turnstile en producción fue implementada. El endpoint de favoritos está correctamente validado y no expone datos de tenants cruzados.

---

## 10. Performance

### [P-MED-01] `getUnreadCount` / `getUnreadLeadIds` usan NOT IN con subquery
**Problema:** `LeadRepository.getUnreadCount()` y `getUnreadLeadIds()` usan:
```sql
WHERE leads.id NOT IN (SELECT lead_id FROM lead_read_marks WHERE user_id = ?)
```
Con una tabla `leads` pequeña el impacto es nulo. Con escala (miles de leads por agente), un LEFT JOIN + IS NULL tiene mejor plan de ejecución en PostgreSQL y evita el comportamiento sorpresivo de NOT IN con NULLs.
**Archivos afectados:** `src/infrastructure/db/repositories/lead.repository.ts:363-376, 516-527`
**Fix recomendado:** Reescribir como LEFT JOIN:
```typescript
.leftJoin(leadReadMarks, and(
  eq(leadReadMarks.leadId, leads.id),
  eq(leadReadMarks.userId, userId)
))
.where(and(...conditions, isNull(leadReadMarks.leadId)))
```
**Prioridad:** Posponer hasta que el volumen de leads lo justifique.

### [P-LOW-01] `catalog-list.tsx` hace una query de count separada en la paginación por cursor
**Problema:** `findAllWithCursor` en `PromocionRepository` hace una query `SELECT COUNT(*)` en la primera página (cursor vacío). Esto es correcto y está en línea con la arquitectura. No hay issue de performance real — el count en primera página es necesario para la UI de paginación.

---

## 11. Deuda Técnica

### Crítica (bloquea producción o seguridad)

Ninguna. No hay deuda crítica.

### Alta

Ninguna. Los dos items de alta prioridad del roadmap anterior (DT-01: tests de PromocionPublishService, DT-02: cursor pagination en primera carga) han sido resueltos.

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | Centralizar `KIND_LABELS` en `domain-labels.ts` y eliminar duplicados en 3 componentes | 0.5h |
| DT-02 | Importar `LABEL_STYLE` desde `backoffice-form.ts` en los 7 componentes que lo definen localmente | 1h |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-03 | Mover `transformToString` después de los imports en blocks-editor.tsx | 0.1h |
| DT-04 | Reescribir `getUnreadCount` / `getUnreadLeadIds` con LEFT JOIN en lugar de NOT IN subquery | 1h |
| DT-05 | Añadir tests para `FavoritesView` verificando el flujo fetch-by-ids | 1h |
| DT-06 | Test que verifica que `createLeadService` encola la notificación al email del agente, no del lead | 1h |
| DT-07 | `as unknown as Record<string,unknown>` en `recordHistory` — tipado débil que podría resolverse con tipos más específicos | 1h |

---

## 12. Quick Wins

> Cambios < 2h, seguros de forma independiente, alto impacto.

### QW-01 — Centralizar KIND_LABELS en domain-labels.ts (~0.5h)

Añadir a `src/shared/constants/domain-labels.ts`:

```typescript
import type { PromocionKind } from "./db-enums";

export const PROMOCION_KIND_LABELS: Record<PromocionKind, string> = {
  portfolio: "Portafolio",
  external: "Captación externa",
};
```

Luego reemplazar las 3 definiciones locales en `catalog-list.tsx`, `catalog-filters.tsx` y `promocion-section-identity.tsx` para importar y usar esta constante.

### QW-02 — Importar LABEL_STYLE desde backoffice-form.ts en block-form-*.tsx (~1h)

Los siguientes archivos definen `const LABEL_STYLE = "font-mono text-[10px]..."` localmente en lugar de importar de `@/shared/styles/backoffice-form`:
- `src/features/promociones/components/block-form-ubicacion.tsx:10`
- `src/features/promociones/components/block-form-plazos.tsx:10`
- `src/features/promociones/components/block-form-zonas.tsx:10`
- `src/features/promociones/components/block-form-calidades.tsx:10`
- `src/features/leads/components/contact-form.tsx` (usa `LABEL_CLASS` con valor idéntico)
- `src/features/engagement/components/ContactForm.tsx` (usa inline literal)

Reemplazar la definición local por `import { LABEL_STYLE } from "@/shared/styles/backoffice-form"`.

### QW-03 — Mover transformToString a posición correcta en blocks-editor.tsx (~0.1h)

Mover la función `transformToString` (líneas 41-48) a después del bloque de imports y antes de la sección de tipos. No afecta comportamiento, mejora legibilidad.

---

## 13. Refactors Estratégicos

### R-01 — Separar PromocionRepository en capas más delgadas

**Valor:** Reducir la carga cognitiva del archivo más complejo del sistema. Un cambio en el esquema de tipologías no debería exigir tocar el mismo archivo que gestiona el historial de cambios.
**Separación propuesta:**
1. Mover `findAllWithCursor` al `CatalogRepository` del backoffice (ya existe `CatalogRepository` para el público — crear una versión autenticada o ampliarla).
2. El `update()` puede reducirse si la orquestación de `recordHistory` + `tipologías sync` se mueve a `PromocionPublishService` o a un nuevo `PromocionUpdateService`.
3. `findById` puede quedarse en `PromocionRepository` — es el lookup básico por ID.
**Coste:** 4-6h. **Riesgo de regresión:** Medio — hay tests de integración que cubren las operaciones. Requiere migrar los tests a los nuevos repositorios.
**Prioridad:** Medio plazo

### R-02 — Reescribir NOT IN subquery como LEFT JOIN en LeadRepository

**Valor:** Correctness (NOT IN con NULLs puede producir resultados vacíos inesperados en SQL) + mejor rendimiento con escala.
**Cambio concreto:** Reemplazar los dos usos de `sql\`... NOT IN (SELECT ...)\`` en `getUnreadCount` y `getUnreadLeadIds` con LEFT JOIN + `isNull()`.
**Coste:** 1h. **Riesgo de regresión:** Bajo. Los tests de integración actuales verificarán que el comportamiento es equivalente.
**Prioridad:** Posponer hasta que el volumen lo justifique.

---

## 14. Refactors NO recomendados

### No refactorizar: TenantAwareRepository

Clase abstracta de 9 líneas que documenta el patrón del sistema. 14+ repositorios la extienden. El coste de eliminarla supera el beneficio marginal.

### No refactorizar: BlocksEditor y TipologiaEditor

`BlocksEditor` (760 líneas) y `TipologiaEditor` (575 líneas) son componentes grandes pero internamente cohesivos. Cada bloque editorial tiene su propio componente de formulario. El drag & drop está bien encapsulado. Dividirlos crearía más archivos sin reducir la complejidad real.

### No refactorizar: LeadRepository a corto plazo

`LeadRepository` (593 líneas) mezcla responsabilidades, pero el código es legible y bien testeado. El coste de separarlo ahora supera el beneficio. Solo refactorizar si crece más o si emerge un nuevo caso de uso que haga el refactor obligatorio.

### No crear: ContactFormLayout compartido

Los tres formularios de contacto (`ContactForm` en engagement, `ContactFormGeneric` en contact, `contact-form` en leads) tienen propósitos y server actions distintos. La estructura visual similar es incidental. Un layout compartido crearía acoplamiento entre features independientes.

### No extraer: LABEL_STYLE de componentes del home

Los componentes `Hero.tsx`, `AboutDomio.tsx`, `Trust.tsx` usan `font-mono text-[10px]` con colores distintos (`text-white/55`, `text-terracota`). No usar `LABEL_STYLE` del backoffice — son componentes de presentación pública con tokens propios.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)

- [ ] [QW-01] Centralizar `KIND_LABELS` en `domain-labels.ts` — 0.5h
- [ ] [QW-02] Importar `LABEL_STYLE` desde `backoffice-form.ts` en `block-form-*.tsx` y otros — 1h
- [ ] [QW-03] Mover `transformToString` después de imports en `blocks-editor.tsx` — 0.1h

### Fase 2 — Corto plazo (próximo mes)

- [ ] [DT-05] Tests para `FavoritesView` verificando el flujo fetch-by-ids — 1h
- [ ] [DT-06] Test que verifica que `createLeadService` encola la notificación al email del agente — 1h
- [ ] [DT-04] Reescribir `getUnreadCount`/`getUnreadLeadIds` con LEFT JOIN — 1h

### Fase 3 — Medio plazo (próximo trimestre)

- [ ] [R-01] Separar `findAllWithCursor` de `PromocionRepository` hacia un `BackofficeCatalogRepository` — 4-6h
- [ ] [DT-07] Tipado más preciso en `recordHistory` (eliminar `as unknown as`) — 1h

### No planificado

- Refactor completo de `LeadRepository` — coste > beneficio a corto plazo
- División de `BlocksEditor` y `TipologiaEditor` — cohesión interna alta, no justificado
- `ContactFormLayout` compartido — introduce acoplamiento entre features independientes

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 9 | Multi-tenant riguroso, tres superficies bien separadas, `PromocionPublishService` testeado. Repositorios grandes pero manejables. |
| Simplicidad | 9 | Rama legacy eliminada, cursor exclusivo, favoritos client-first. `transformToString` fuera de orden como única nota negativa. |
| Mantenibilidad | 8 | Email encolado de forma consistente. `KIND_LABELS` duplicado en 3 sitios. `LABEL_STYLE` en 7 archivos que deberían importar. |
| Cohesión | 9 | Feature modules bien delimitados. Server/client separation respetada. `CatalogRepository` separado del `PromocionRepository`. |
| Acoplamiento | 9 | Sin dependencias circulares. DIP respetado en todas las rutas de creación de lead. |
| Legibilidad | 9 | Código limpio, bien comentado, naming consistente. JSDoc donde aporta valor. |
| Calidad del diseño | 9 | Cursor pagination, RLS por diseño, cola persistente, tests de contrato, Turnstile, favoritos client-first. |
| Testing | 9 | Unit, integration, isolation, contract, E2E. `PromocionPublishService` cubierto. Tests de aislamiento multi-tenant bloqueantes. Gaps menores en FavoritesView y notificación de agente. |
| Seguridad | 10 | Turnstile bien integrado con alerta en producción, validación Zod en todos los boundaries, RLS, rate limiting, consentimiento RGPD, endpoint de favoritos validado. |
| Deuda técnica | 8 | Sin deuda crítica ni alta. Deuda media/baja localizada en duplicaciones de constantes. |
| **Total** | **88/100** | |

**Calificación:** A-

**Justificación:** Domio ha mejorado de forma sólida (83 → 88). Todos los items de Fase 1 y Fase 2 del roadmap anterior han sido completados: tests de `PromocionPublishService`, cursor pagination exclusivo en el catálogo backoffice, `createLeadService` usando `EmailService.enqueue()` de forma consistente, favoritos con flujo client-first, constantes de estilo extraídas a `shared/styles/backoffice-form.ts`, alerta de Turnstile en producción. Los 12 puntos que separan al proyecto de un A+ son deuda menor: `KIND_LABELS` duplicado en 3 componentes (violación leve de §11.1 de la constitución), 7 archivos que definen `LABEL_STYLE` localmente en lugar de importar, y repositorios que siguen creciendo. Los tres quick wins de la Fase 1 son cambios triviales de 1.6h total. Completarlos subiría el score a A.
