# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-13
> Rama auditada: main (estado actual del repositorio)
> Auditoría completa: arquitectura, SOLID, YAGNI, KISS, DRY, code smells, testing, seguridad, performance

---

## 1. Executive Summary

**Score:** 78 — **B**

**Estado general:** Domio es un proyecto con una base arquitectónica deliberada y madura. El modelo multi-tenant con RLS + `SET LOCAL` transaccional, la separación en tres contextos (Public/Authenticated/ApiKey), la cola de email persistente y los tests de aislamiento bloqueantes demuestran un nivel de ingeniería superior a la media. El código de infraestructura es consistente y bien testeado. Los problemas se concentran en la capa de presentación del backoffice: componentes UI que han crecido más allá de su responsabilidad inicial, y en algunos repositorios que acumulan demasiadas responsabilidades. No hay deuda sistémica ni riesgos de seguridad críticos.

**Fortalezas principales:**
- Multi-tenant DNA respetado rigurosamente: `set_config` transaccional, repositorios context-aware, tests de aislamiento RLS bloqueantes en CI.
- Separación de capas coherente: tres contextos de tenant, `TenantAwareRepository`, feature modules bien delimitados con server/client separation.
- Testing de alta calidad: unit, integration, isolation, contract, E2E con Page Object Model. Cobertura amplia y útil.
- Resiliencia: cola de email persistente con backoff exponencial, rate limiting con degraded mode, API con versionado explícito.
- Seguridad sólida: validación Zod en todos los boundaries, autenticación API key con bcrypt + prefix filter, RGPD con consentimiento en transacción, historiales inmutables por policy RLS.
- Cursor pagination en catálogo público (no OFFSET), como exige la constitution.

**Riesgos principales:**
- Repositorios que han acumulado responsabilidades (PromocionRepository: 571 líneas, LeadRepository: 599 líneas).
- Componentes UI del backoffice que superan las 500 líneas con mezcla de estado, lógica y renderizado.
- `createInstitutionalLead` bypass del `EmailService`, insertando directamente en `email_queue` y duplicando lógica de validación.
- Magic strings (islas, municipios) hardcodeados en `FilterBar.tsx` en lugar de `shared/constants/`.
- Variable mutable a nivel de módulo (`tempIdCounter`) en `tipologia-editor.tsx`: riesgo en SSR.

---

## 2. Arquitectura

### Estado actual

Domio sigue una arquitectura de capas bien definida:

```
app/(public)/         → Web pública comercial (SSR/ISR)
app/(auth)/panel/     → Backoffice (auth guard + middleware)
app/api/v1/           → API pública versionada (API key auth)
app/api/internal/     → Endpoints del backoffice (session auth)

src/features/         → Módulos de negocio (catalog, promociones, leads, etc.)
src/infrastructure/   → Servicios externos (DB, auth, email, media, rate-limiting, tenant)
src/shared/           → Tipos, constantes, componentes UI reutilizables, utils
```

**Patrón central:** `TenantContext` → `TenantAwareRepository` → transacción con `SET LOCAL app.current_tenant_id`. Tres contextos concretos (`PublicContext`, `AuthenticatedContext`, `ApiKeyContext`) aplican filtros obligatorios a nivel de repositorio.

**Datos:** PostgreSQL 16 en Neon con PgBouncer (transaction pooling). Drizzle ORM con schemas tipados. RLS activado en todas las tablas de dominio. PostGIS para geolocalización.

### Fortalezas

- **Aislamiento multi-tenant por diseño, no por convención.** Cada repositorio recibe un `TenantContext` y abre transacción con `SET LOCAL`. No hay shortcuts. Los tests de aislamiento (`tests/isolation/`) verifican que dos tenants no ven datos cruzados.
- **Tres superficies claramente separadas** con mecanismos de auth distintos: sesión JWT para backoffice, API key para API pública, sin sesión para web pública.
- **Cola de email persistente** con worker separado. La caída de Resend no bloquea la creación de leads.
- **Tests de contrato** versionados en `tests/contract/v1/` que bloquean CI si el schema de la API pública diverge.
- **DB client con lazy proxy** (`src/infrastructure/db/client.ts`): elegante, evita inicialización prematura en edge runtime.

### Debilidades

- **Los repositorios están creciendo más allá de SRP.** `PromocionRepository` (571 líneas) gestiona CRUD, tipologías sync, history recording, y detail assembly. `LeadRepository` (599 líneas) mezcla queries de lectura, escritura, validación de transiciones de estado, y lógica de reasignación.
- **No hay service layer entre los route handlers y los repositorios.** Los route handlers de `app/api/internal/promociones/[id]/route.ts` (419 líneas) contienen lógica de negocio (slug generation, media validation, blocks validation, draft merge) que debería vivir en un servicio.
- **`createInstitutionalLead`** bypass del `EmailService` e inserta directamente en `email_queue`, duplicando la validación de email y template que ya hace `EmailService.enqueue()`.

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | Route handler de PATCH promociones contiene lógica de negocio (slug gen, media validation, blocks validation, draft merge) | `app/api/internal/promociones/[id]/route.ts` | Alto |
| A2 | `createInstitutionalLead` bypass del `EmailService`, inserta directamente en `email_queue` | `src/features/api-public/server/create-institutional-lead.ts` | Medio |
| A3 | No hay service layer entre route handlers y repositorios | `app/api/internal/**/*.ts` | Medio |

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] PromocionRepository tiene múltiples razones para cambiar
**Problema:** `PromocionRepository` (571 líneas) gestiona: (1) CRUD de promociones, (2) ensamblado de tipologías con unidades, (3) detail assembly con content blocks y media, (4) history recording vía `PromocionHistoryRepository`, (5) tipologías sync vía `TipologiaSyncService`. Cada una de estas responsabilidades tiene una razón de cambio distinta.
**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts`
**Impacto:** El método `update()` solo tiene 114 líneas y toca 5 responsabilidades. Cambiar la lógica de history recording obliga a entender el flujo completo de update. El método `findDetailBySlug()` hace 3 queries secuenciales dentro de la misma transacción, mezclando el concepto de "buscar una promoción" con "ensamblar su detalle completo".
**Prioridad:** Planificar
**Acción concreta:** Extraer `PromocionDetailAssembler` (responsable de `findDetailBySlug` y `assembleTipologias`) y mover la lógica de history recording al `update()` del route handler o un `PromocionUpdateService`.

#### [SRP-02] LeadRepository mezcla queries, escritura y validación de dominio
**Problema:** `LeadRepository` (599 líneas) contiene: queries de lectura con filtros complejos, escritura (create, updateStatus, addNote, markAsRead, reassign), validación de transiciones de estado (`validateStatusTransition`), y lógica de export CSV. La validación de dominio no pertenece al repositorio.
**Archivos afectados:** `src/infrastructure/db/repositories/lead.repository.ts`
**Impacto:** `updateStatus()` (75 líneas) mezcla fetch, validación de transición, update, history insert, y re-fetch. Si cambia la máquina de estados, hay que tocar el repositorio.
**Prioridad:** Planificar
**Acción concreta:** Mover `validateStatusTransition` a un servicio de dominio `LeadStateService`. Considerar extraer `LeadExportRepository` para la lógica de export.

#### [SRP-03] PATCH route handler de promociones contiene lógica de negocio
**Problema:** `app/api/internal/promociones/[id]/route.ts` (419 líneas) contiene: slug generation, draft payload merge, media validation, blocks validation, location conversion, ISR revalidation. Mezcla el rol de HTTP handler con el de orquestador de negocio.
**Archivos afectados:** `app/api/internal/promociones/[id]/route.ts`
**Impacto:** La función `prepareUpdateData()` (44 líneas) y `validateMediaOnPublish()` / `validateBlocksOnPublish()` son lógica de negocio disfrazada de helper de route. No son testeables de forma aislada.
**Prioridad:** Planificar
**Acción concreta:** Crear `PromocionPublishService` que encapsule: validación de media + blocks + slug generation + draft merge. El route handler solo debe: parsear request → llamar servicio → devolver response.

### OCP — Open/Closed Principle

No hay violaciones relevantes. El sistema de bloques editoriales usa un switch sobre `ContentBlockType`, pero con solo 5 tipos y sin expectativa de extensión frecuente, un switch explícito es más legible que una abstracción polimórfica. No forzar OCP aquí.

### LSP — Liskov Substitution Principle

No hay violaciones. Los tres contextos (`PublicContext`, `AuthenticatedContext`, `ApiKeyContext`) extienden `TenantContext` correctamente. `AuthenticatedContext.withTransaction()` añade `SET LOCAL app.current_user_id` sobre el comportamiento del padre, lo cual es una extensión compatible.

### ISP — Interface Segregation Principle

No hay violaciones relevantes. Las interfaces de repositorio son concretas (no hay interfaces abstractas innecesarias). Los tipos `RateLimiter`, `ResendClient`, `TemplateRegistry` están bien segregados.

### DIP — Dependency Inversion Principle

#### [DIP-01] ArsopRepository depende directamente de MediaService
**Problema:** `ArsopRepository` recibe `MediaService` en su constructor y lo usa para subir el CSV de exportación a R2. Un repositorio no debería depender de un servicio de infraestructura de otro dominio.
**Archivos afectados:** `src/infrastructure/db/repositories/arsop.repository.ts`
**Impacto:** Bajo. Funcionalmente correcto, pero conceptualmente un repositorio de ARSOP no debería saber cómo se suben archivos a R2.
**Prioridad:** Posponer
**Acción concreta:** Si se refactoriza, extraer la subida a R2 a un `ArsopExportService` que orquesta: generar CSV → subir a R2 → registrar en arsop_requests.

---

## 4. YAGNI

### Código innecesario

No se ha detectado código muerto significativo. El proyecto está limpio en este aspecto.

### Abstracciones innecesarias

#### `TenantAwareRepository` (9 líneas)
**Problema:** Es una clase abstracta que solo delega `withTransaction()` al contexto. Añade una capa de indirección sin valor: cada repositorio podría recibir el `TenantContext` directamente.
**Archivos afectados:** `src/infrastructure/db/repositories/TenantAwareRepository.ts`
**Impacto:** Bajo. No causa daño, pero tampoco aporta valor. Los 14 repositorios que la extienden podrían recibir el contexto directamente.
**Prioridad:** No hacer
**Justificación:** El coste de eliminarla (cambiar 14 repositorios) supera el beneficio. Es una abstracción barata que documenta la intención.

### Código eliminable

| Código | Motivo | Riesgo de eliminar |
|--------|--------|--------------------|
| `src/context/.gitkeep` | Carpeta vacía, el estado global vive en los contextos de tenant | Muy bajo |

---

## 5. KISS

### Complejidad accidental

#### [KISS-01] Variable mutable a nivel de módulo en tipologia-editor.tsx
**Problema:** `tempIdCounter` (línea 71) es una variable mutable a nivel de módulo. En SSR, esta variable se comparte entre requests y puede generar IDs duplicados o predecibles.
**Archivos afectados:** `src/features/promociones/components/tipologia-editor.tsx:71-75`
**Impacto:** Medio. En producción con SSR, dos usuarios concurrentes podrían generar el mismo `_tempId`.
**Prioridad:** Hacer inmediatamente
**Acción concreta:** Reemplazar por `useRef` o `crypto.randomUUID()` dentro del componente.

#### [KISS-02] ISLAND_OPTS y MUNICIPALITY_OPTS hardcodeados en FilterBar
**Problema:** Las listas de islas y municipios están hardcodeadas como arrays de strings en `FilterBar.tsx` (líneas 56-77). La constitution exige constantes centralizadas en `shared/constants/`.
**Archivos afectados:** `src/features/catalog/components/FilterBar.tsx:56-77`
**Impacto:** Medio. Si cambia la lista de municipios, hay que buscar en el código. Viola la regla §11.1 de la constitution (enums cerrados como fuente única).
**Prioridad:** Hacer inmediatamente
**Acción concreta:** Mover a `src/shared/constants/islands.ts` y `src/shared/constants/municipalities.ts`.

### Capas innecesarias

No se han detectado capas de indirección innecesarias. La separación `TenantContext → TenantAwareRepository → Repository` es deliberada y está bien justificada.

### Simplificaciones posibles

- `PromocionRepository.update()` podría simplificarse si la lógica de history recording se mueve fuera.
- `LeadRepository.updateStatus()` podría simplificarse si la validación de transición se mueve a un servicio.

---

## 6. DRY

### Duplicaciones relevantes

#### [DRY-01] Lógica de validación de bloques duplicada client/server
**Problema:** `BlocksEditor` valida payloads con `validateBlockPayload()` (client-side Zod). Los server actions (`upsertContentBlockAction`) validan de nuevo con el mismo schema. La validación server es obligatoria (seguridad), pero la lógica de mapeo de errores de Zod a field errors está duplicada.
**Archivos afectados:** `src/features/promociones/components/blocks-editor.tsx`, `src/features/promociones/actions/content-blocks.actions.ts`
**Impacto:** Bajo. La duplicación es parcial y la validación server es obligatoria. No unificar.
**Prioridad:** No hacer
**Justificación:** La validación client es UX, la server es seguridad. Deben ser independientes.

#### [DRY-02] Tres componentes de formulario de contacto con overlap parcial
**Problema:** Existen tres componentes de formulario de contacto: `ContactForm` (engagement), `ContactFormGeneric` (contenidos), y `contact-form` (leads). Los tres renderizan campos similares y llaman a server actions distintos, pero comparten estructura visual.
**Archivos afectados:** `src/features/engagement/components/ContactForm.tsx`, `src/features/contenidos/components/ContactConfigForm.tsx`, `src/features/leads/components/contact-form.tsx`
**Impacto:** Medio. Un cambio en el layout del formulario de contacto requiere editar tres archivos.
**Prioridad:** Planificar
**Acción concreta:** Evaluar si un `ContactFormLayout` compartido en `shared/components/` reduce la duplicación sin añadir complejidad.

### Duplicaciones aceptables

- **CSS class constants** (`TRANSITION_CLS`, `FOCUS_VISIBLE_CLS`, etc.) repetidas en múltiples componentes. Unificarlas en un `shared/styles.ts` tentaría crear un sistema de estilos global que Tailwind ya resuelve. No unificar.
- **`buildBaseConditions()` en `LeadRepository`** y **`findAll()` en `PromocionRepository`** tienen lógica similar de construcción de condiciones WHERE con filtros por rol. La unificación tentadora crearía un abstract filter builder prematuro. No unificar.

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo | Severidad |
|---|-------|-----------|------|-----------|
| S1 | PromocionRepository: 571 líneas, 5 responsabilidades | `src/infrastructure/db/repositories/promocion.repository.ts` | God Class | Alta |
| S2 | LeadRepository: 599 líneas, mezcla queries + validación + export | `src/infrastructure/db/repositories/lead.repository.ts` | God Class | Alta |
| S3 | PATCH route handler: 419 líneas con lógica de negocio | `app/api/internal/promociones/[id]/route.ts` | Long Method / SRP | Alta |
| S4 | BlocksEditor: 759 líneas, mezcla estado + validación + drag & drop + renderizado | `src/features/promociones/components/blocks-editor.tsx` | God Component | Media |
| S5 | FilterBar: 583 líneas con magic strings de islas y municipios | `src/features/catalog/components/FilterBar.tsx` | Magic Strings / Long Component | Media |
| S6 | TipologiaEditor: 581 líneas con estado mutable a nivel de módulo | `src/features/promociones/components/tipologia-editor.tsx` | God Component / Mutable State | Media |
| S7 | LeadDetail: 507 líneas mezcla estado + acciones + renderizado | `src/features/leads/components/lead-detail.tsx` | God Component | Media |
| S8 | LeadsTable: 508 líneas con paginación + filtros + renderizado | `src/features/leads/components/leads-table.tsx` | God Component | Media |
| S9 | MediaGallery: 536 líneas con drag & drop + upload + delete + reorder | `src/features/promociones/components/media-gallery.tsx` | God Component | Media |
| S10 | `tempIdCounter` mutable a nivel de módulo | `src/features/promociones/components/tipologia-editor.tsx:71` | Global Mutable State | Alta |
| S11 | `createInstitutionalLead` bypass de EmailService | `src/features/api-public/server/create-institutional-lead.ts` | Feature Envy / Duplicación | Media |
| S12 | PromocionRepository.update(): 114 líneas con 5 responsabilidades | `src/infrastructure/db/repositories/promocion.repository.ts:400-517` | Long Method | Alta |
| S13 | get-detail-data.ts: 374 líneas mezcla SEO + structured data + fallbacks | `src/features/detail/server/get-detail-data.ts` | God Module | Media |

### Clasificación por severidad
- **Alta:** S1, S2, S3, S10, S12
- **Media:** S4, S5, S6, S7, S8, S9, S11, S13
- **Baja:** ninguna

### Prioridad
- **Hacer de inmediato:** S10 (mutable state en SSR)
- **Planificar:** S1, S2, S3, S5, S12 (refactors de repositorios y route handlers)
- **Posponer:** S4, S6, S7, S8, S9, S11, S13 (componentes UI grandes pero funcionales)

---

## 8. Testing

### Estado

El proyecto tiene una infraestructura de testing madura y bien organizada:

- **Unit tests** en `tests/unit/` y co-locados con `*.spec.ts` junto al código.
- **Integration tests** en `tests/integration/` cubriendo operaciones de negocio completas.
- **Isolation tests** en `tests/isolation/` verificando aislamiento multi-tenant.
- **Contract tests** en `tests/contract/v1/` con schemas JSON versionados.
- **E2E tests** en `tests/e2e/` con Playwright y Page Object Model.
- **Feature tests** en `tests/features/` para componentes UI específicos.

### Calidad

La calidad de los tests es alta. Los tests son específicos, asertivos, y no están acoplados a implementación. Los tests de aislamiento son particularmente notables: crean dos tenants sintéticos y verifican que ninguno ve datos del otro.

Los tests de contrato con snapshots JSON y verificación de divergencia son un patrón excelente para la API pública.

### Cobertura útil

- **Bien cubierto:** repositorios, contextos de tenant, rate limiting, email service/worker, API key auth, validación de schemas, aislamiento RLS.
- **Cobertura aceptable:** componentes UI del backoffice, server actions.
- **Cobertura baja:** componentes de catálogo público (FilterBar, CatalogGrid), componentes de detalle de promoción.

### Mejoras

| Mejora | Prioridad | Coste |
|--------|-----------|-------|
| Tests unitarios para `prepareUpdateData()` y `validateMediaOnPublish()` del PATCH route | Alta | Bajo |
| Tests de integración para `createInstitutionalLead` verificando que usa EmailService | Media | Bajo |
| Tests E2E para el flujo completo de edición de promoción (borrador → publicar) | Media | Alto |

---

## 9. Seguridad

### [SEC-HIGH-01] Texto de consentimiento RGPD hardcodeado en create-lead-action.ts
**Criticidad:** High
**Archivo:** `src/features/engagement/server/create-lead-action.ts`
**Problema:** El texto de consentimiento se almacena hardcodeado en lugar de consumir `RGPD_CONSENT_TEXT_LEAD` de `shared/constants/consent-texts.ts`. Esto crea divergencia silenciosa entre lo que el usuario ve en el formulario y lo que se persiste en `consent_records`.
**Fix:** Importar y usar la constante centralizada `RGPD_CONSENT_TEXT_LEAD`.

### [SEC-LOW-01] API key auth hace bcrypt.compare secuencial sobre candidatos
**Criticidad:** Low
**Archivo:** `src/features/api-public/middleware/api-key-auth.ts:100-109`
**Problema:** `findMatchingApiKey` itera sobre las claves candidatas y hace `bcrypt.compare` secuencial. Con el prefix filter, el conjunto es O(1) en la práctica, pero si el prefix filter falla (legacy keys sin prefix), podría ser O(n).
**Fix:** No urgente. El prefix filter mitiga el riesgo. Si se añaden muchas legacy keys, considerar parallel bcrypt con `Promise.all`.

### [SEC-LOW-02] Logger puede exponer mensajes de error internos
**Criticidad:** Low
**Archivos:** `app/api/v1/promociones/route.ts:66-69`, `app/api/v1/leads/institutional/route.ts:86-89`
**Problema:** Los logger.error en los route handlers de la API pública registran el mensaje de error completo. Si el error contiene datos sensibles (ej. query params con API key), quedarían en los logs.
**Fix:** Sanitizar los mensajes de error antes de loggear, o registrar solo el tipo de error, no el mensaje completo.

### Seguridad — aspectos positivos

- **No hay secrets en el código fuente.** Todas las credenciales viven en variables de entorno.
- **Validación Zod en todos los boundaries** de entrada (API pública, formularios, server actions).
- **RLS activado en todas las tablas de dominio** con policies de aislamiento por tenant.
- **Rate limiting** en login (IP-based) y API pública (key-based) con degraded mode.
- **CSRF** protegido por Auth.js. **XSS** mitigado por escapado de React + validación Zod.
- **Historiales inmutables** por policy RLS (sin UPDATE ni DELETE).
- **Consentimiento RGPD** en la misma transacción que la creación del lead.
- **Modo de privacidad del mapa** respetado en serialización (ApiKeyContext filtra coordenadas exactas).
- **Turnstile** integrado en formularios públicos de captura de leads.

---

## 10. Performance

### [P-HIGH-01] Catálogo del backoffice usa OFFSET en lugar de cursor
**Problema:** `PromocionRepository.findAll()` (línea 229) usa `offset = (page - 1) * limit` para la paginación del catálogo del backoffice. La constitution exige cursor pagination. Con miles de promociones, OFFSET degrada a O(n).
**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts:229`
**Fix recomendado:** Implementar cursor pagination para el backoffice, como ya existe en `CatalogRepository.findForApiCursor()` y `CatalogRepository.findPublicWithCursor()`.

### [P-MEDIUM-01] Favoritos carga hasta 100 promociones en servidor para filtrar en cliente
**Problema:** La página de favoritos carga todas las promociones marcadas (hasta 100) en el servidor y las filtra en el cliente. Patrón documentado como deuda.
**Archivos afectados:** `src/features/favorites/FavoritesView.tsx`
**Fix recomendado:** Implementar paginación server-side con filtro de IDs de favoritos.

### [P-MEDIUM-02] PromocionRepository.findDetailBySlug() hace 3 queries secuenciales
**Problema:** `findDetailBySlug()` ejecuta: (1) query de promoción, (2) query de tipologías + unidades, (3) query de content blocks, (4) query de media assets. Cuatro queries secuenciales dentro de la misma transacción.
**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts:278-329`
**Fix recomendado:** Considerar un JOIN para promoción + tipologías, o al menos parallelizar las queries de content blocks y media assets con `Promise.all`.

### [P-LOW-01] CatalogRepository.findCardExtras() hace dos queries donde bastaría una
**Problema:** `findCardExtras()` ejecuta una query para covers y otra para aggregates de tipologías. Podrían combinarse en una sola query con LEFT JOINs.
**Archivos afectados:** `src/infrastructure/db/repositories/catalog.repository.ts:451-525`
**Fix recomendado:** Combinar en una sola query con LEFT JOIN. El beneficio es marginal porque solo se ejecuta una vez por página del catálogo.

---

## 11. Deuda Técnica

### Crítica (bloquea producción o seguridad)

Ninguna. No hay deuda crítica.

### Alta

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | Texto de consentimiento RGPD hardcodeado en `create-lead-action.ts` | 1h |
| DT-02 | `tempIdCounter` mutable a nivel de módulo en `tipologia-editor.tsx` (riesgo SSR) | 1h |
| DT-03 | ISLAND_OPTS y MUNICIPALITY_OPTS hardcodeados en `FilterBar.tsx` | 2h |
| DT-04 | Catálogo backoffice usa OFFSET en lugar de cursor | 4h |

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-05 | `createInstitutionalLead` bypass del `EmailService` | 2h |
| DT-06 | PATCH route handler con lógica de negocio no testeable | 4h |
| DT-07 | PromocionRepository con 5 responsabilidades | 6h |
| DT-08 | LeadRepository con validación de dominio + export | 4h |
| DT-09 | Tres componentes de formulario de contacto con overlap | 3h |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-10 | Favoritos carga 100 promociones para filtrar en cliente | 3h |
| DT-11 | `findDetailBySlug()` con 4 queries secuenciales | 2h |
| DT-12 | `get-detail-data.ts` mezcla SEO + structured data | 2h |

---

## 12. Quick Wins

> Cambios < 2h, seguros de forma independiente, alto impacto.

### QW-01 — Reemplazar `tempIdCounter` por `crypto.randomUUID()` (~0.5h)

En `src/features/promociones/components/tipologia-editor.tsx`, reemplazar:

```typescript
let tempIdCounter = 0;
function nextTempId(): string {
  tempIdCounter += 1;
  return `tipologia-temp-${tempIdCounter}-${Date.now()}`;
}
```

Por:

```typescript
function nextTempId(): string {
  return `tipologia-temp-${crypto.randomUUID()}`;
}
```

Elimina el estado mutable global y el riesgo de IDs duplicados en SSR.

### QW-02 — Usar constante de consentimiento RGPD centralizada (~0.5h)

En `src/features/engagement/server/create-lead-action.ts`, reemplazar el texto hardcodeado por la importación de `RGPD_CONSENT_TEXT_LEAD` desde `@/shared/constants/consent-texts`.

### QW-03 — Extraer ISLAND_OPTS y MUNICIPALITY_OPTS a constantes (~1h)

Mover los arrays de islas y municipios de `FilterBar.tsx` a `src/shared/constants/islands.ts` y `src/shared/constants/municipalities.ts`.

---

## 13. Refactors Estratégicos

### R-01 — Extraer PromocionPublishService

**Valor:** El PATCH route handler de promociones (419 líneas) contiene lógica de negocio no testeable de forma aislada: slug generation, draft merge, media validation, blocks validation. Extraer un servicio permite testear cada paso independientemente y reduce el route handler a ~50 líneas.
**Separación propuesta:**
```
src/features/promociones/server/promocion-publish.service.ts
  - prepareUpdateData()
  - validateMediaOnPublish()
  - validateBlocksOnPublish()
  - publish() → orquesta todo
```
**Coste:** 4h. **Riesgo de regresión:** Bajo. Los helpers ya están extraídos como funciones puras; solo hay que moverlas.

### R-02 — Simplificar PromocionRepository.update()

**Valor:** El método `update()` (114 líneas) mezcla 5 responsabilidades. Mover la lógica de history recording y tipologías sync fuera del repositorio reduce el método a ~40 líneas de CRUD puro.
**Separación propuesta:**
- `PromocionHistoryService.recordChanges()` — mueve la lógica de diff y persistencia de historial.
- `TipologiaSyncService` ya existe; solo hay que mover su invocación fuera del `update()`.
**Coste:** 4h. **Riesgo de regresión:** Medio. Hay que mantener la atomicidad de la transacción.

### R-03 — Unificar createInstitutionalLead con EmailService

**Valor:** `createInstitutionalLead` duplica la validación de email y template que ya hace `EmailService.enqueue()`. Usar el servicio elimina la duplicación y garantiza que la validación es consistente.
**Cambio concreto:** Reemplazar el INSERT directo en `email_queue` por una llamada a `emailService.enqueue()`. Requiere inyectar el servicio o llamar a la función dentro de la transacción.
**Coste:** 2h. **Riesgo de regresión:** Bajo.

---

## 14. Refactors NO recomendados

> OBLIGATORIO. Explica qué NO harías y por qué.

### No refactorizar: TenantAwareRepository

Es una clase abstracta de 9 líneas que solo delega `withTransaction()`. Eliminarla obligaría a cambiar 14 repositorios sin aportar valor. Es una abstracción barata que documenta la intención del patrón.

### No refactorizar: Componentes UI del backoffice (BlocksEditor, TipologiaEditor, LeadDetail, LeadsTable, MediaGallery)

Estos componentes tienen 500-760 líneas cada uno, pero están bien estructurados internamente con sub-componentes, hooks extraídos, y constantes CSS. Dividirlos ulteriormente crearía más archivos sin reducir la complejidad real. El umbral de 500 líneas es una guía, no un dogma. El coste de dividir (más archivos, más imports, más indirección) supera el beneficio cuando la cohesión interna es alta.

### No unificar: Validación client/server de bloques editoriales

La validación client-side en `BlocksEditor` y la validación server-side en los actions usan el mismo schema Zod, pero tienen propósitos distintos: UX vs seguridad. Unificarlas tentaría a eliminar la validación server "porque ya la hace el cliente". Esto es un anti-patrón de seguridad.

### No refactorizar: CSS class constants duplicadas

`TRANSITION_CLS`, `FOCUS_VISIBLE_CLS`, `INPUT_BASE`, etc. aparecen en múltiples componentes. Extraerlas a un `shared/styles.ts` crearía un sistema de estilos global que Tailwind ya resuelve con sus utility classes. La "duplicación" es incidental y cada componente evoluciona independientemente.

### No refactorizar: `buildBaseConditions()` en LeadRepository vs PromocionRepository

La lógica de construcción de condiciones WHERE con filtros por rol es similar en ambos repositorios, pero los filtros son distintos (leads tiene `source`, `search`, `dateFrom/To`; promociones tiene `island`, `municipality`, `constructionStatus`). Un abstract filter builder sería una abstracción prematura que ocultaría más de lo que aporta.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana) ✅
- [x] [QW-01] Reemplazar `tempIdCounter` por `crypto.randomUUID()` — 0.5h
- [x] [QW-02] Usar constante de consentimiento RGPD centralizada — 0.5h *(ya aplicado)*
- [x] [QW-03] Extraer ISLAND_OPTS y MUNICIPALITY_OPTS a constantes — 1h
- [x] [DT-01] Fix texto consentimiento RGPD hardcodeado — 1h *(ya aplicado)*

### Fase 2 — Corto plazo (próximo mes) ✅
- [x] [DT-05] Unificar `createInstitutionalLead` con `EmailService` — 2h
- [x] [R-01] Extraer `PromocionPublishService` del PATCH route handler — 4h
- [x] [DT-04] Implementar cursor pagination en catálogo backoffice — 4h

### Fase 3 — Medio plazo (próximo trimestre) ✅
- [x] [R-02] Simplificar `PromocionRepository.update()` extrayendo history recording — 4h
- [x] [DT-08] Mover validación de transiciones de estado fuera de `LeadRepository` — 4h
- [x] [DT-09] Evaluar `ContactFormLayout` compartido — 3h *(evaluado: no implementar, formularios con propósitos distintos)*
- [x] [DT-11] Paralelizar queries en `findDetailBySlug()` — 2h

### No planificado
- Refactor de `TenantAwareRepository` — YAGNI, coste > beneficio
- División de componentes UI del backoffice — cohesión interna alta, no justificado
- Unificación de validación client/server de bloques — anti-patrón de seguridad

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 9 | Multi-tenant DNA riguroso, tres superficies bien separadas, cola de email persistente. Solo falta un service layer entre route handlers y repositorios. |
| Simplicidad | 7 | Componentes UI grandes pero cohesivos. Algunos magic strings y estado mutable global. No hay sobre-abstracción. |
| Mantenibilidad | 7 | Repositorios que han crecido más allá de SRP. Route handlers con lógica de negocio. Pero el código es legible y bien estructurado. |
| Cohesión | 8 | Feature modules bien delimitados. Server/client separation respetada. Los repositorios tienen cohesión aceptable dentro de su tamaño. |
| Acoplamiento | 8 | DIP respetado en general. Una violación menor (ArsopRepository → MediaService). Inyección de dependencias en auth y rate limiting. |
| Legibilidad | 8 | Código limpio, bien comentado, con JSDoc donde aporta valor. Naming consistente en español para el dominio. |
| Calidad del diseño | 8 | Cursor pagination, RLS por diseño, cola persistente, tests de contrato. Decisiones de diseño deliberadas y documentadas. |
| Testing | 9 | Unit, integration, isolation, contract, E2E. Tests de aislamiento multi-tenant bloqueantes. Page Object Model. Cobertura amplia. |
| Seguridad | 8 | Validación Zod en todos los boundaries, RLS, rate limiting, consentimiento RGPD. Un issue alto (consentimiento hardcodeado) y dos low. |
| Deuda técnica | 7 | Deuda media-baja. No hay deuda crítica. Los items son localizados y corregibles sin riesgo. |
| **Total** | **78/100** | **Calificación B** |

**Calificación:** B

**Justificación:** Domio mere un B sólido. La arquitectura multi-tenant es ejemplar, el testing es maduro, y la seguridad está bien cubierta. Los 22 puntos que faltan para un A vienen de: (1) repositorios que han acumulado responsabilidades y necesitan una pasada de SRP, (2) route handlers que contienen lógica de negocio no testeable, (3) componentes UI grandes que podrían simplificarse pero no es urgente, y (4) un issue de seguridad alto (consentimiento RGPD hardcodeado) que es un fix trivial. Subir a A requiere ejecutar los refactors R-01 y R-02 y los quick wins QW-01 a QW-03. Subir a A+ requeriría además un service layer formal entre los route handlers y los repositorios.
