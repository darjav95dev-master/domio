# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-13
> Rama auditada: chore/engenier-auditor (estado actual del repositorio, post-CAPTCHA)
> Auditoría completa: arquitectura, SOLID, YAGNI, KISS, DRY, code smells, testing, seguridad, performance

---

## 1. Executive Summary

**Score:** 83 — **B+**

**Estado general:** Domio ha mejorado sustancialmente desde la auditoría anterior (78 → 83). Los quick wins y refactors estratégicos de la versión anterior han sido aplicados correctamente: `tempIdCounter` eliminado, constante RGPD centralizada, `ISLAND_OPTS`/`MUNICIPALITY_OPTS` extraídas a `shared/constants/islands.ts`, `PromocionPublishService` correctamente extraído del route handler (258 líneas vs 419 anteriores), `findDetailBySlug` paralelizado con `Promise.all`, cursor pagination en el catálogo del backoffice, y validación de transiciones de estado movida fuera del repositorio a `shared/types/lead-schema.ts`. La integración de Cloudflare Turnstile es sólida y bien encapsulada. Los 17 puntos que separan al proyecto de un A vienen principalmente de repositorios que siguen acumulando responsabilidades, y del patrón de inserción directa en `email_queue` desde `create-lead-action.ts` que bypassa el `EmailService`.

**Fortalezas principales:**
- Multi-tenant DNA rigurosamente respetado: `SET LOCAL` transaccional, repositorios context-aware, tests de aislamiento bloqueantes.
- Testing maduro y multicapa: unit, integration, isolation, contract, E2E con POM. Test de consentimiento RGPD verifica que `textAccepted` almacena la constante canónica.
- CAPTCHA (Turnstile) bien integrado: encapsulado en `verifyTurnstileToken()`, degraded mode en desarrollo, sin exposición de secret key al cliente.
- `PromocionPublishService` correctamente extraído: route handler de PATCH ahora en 258 líneas de HTTP puro.
- Validación de transiciones de estado extraída a `shared/types/lead-schema.ts` (dominio puro, testeable).
- Constantes centralizadas: `ISLANDS`, `MUNICIPALITIES`, `RGPD_CONSENT_TEXT_LEAD`, `NULL_PROMOCION_ID`.

**Riesgos principales:**
- `createLeadService` en `create-lead-action.ts` inserta directamente en `email_queue` en lugar de usar `EmailService.enqueue()`, mientras que `createInstitutionalLead` ya usa el servicio correctamente. Inconsistencia que puede divergir si se cambia la lógica de encolado.
- `PromocionRepository` (699 líneas) y `LeadRepository` (593 líneas) siguen acumulando responsabilidades. Son el techo de complejidad que limita la calificación.
- La página de favoritos (`app/(public)/favoritos/page.tsx`) tiene un comentario explícito de deuda: carga hasta 100 promociones para filtrar en cliente. Esto es un límite operativo documentado pero no resuelto.
- `catalog-filters.tsx` del backoffice usa inputs de texto libre para isla y municipio en lugar de selectores contra las constantes `ISLANDS`/`MUNICIPALITIES` — aceptable porque el backoffice puede filtrar por términos parciales, pero inconsistente con el enfoque del catálogo público.

---

## 2. Arquitectura

### Estado actual

```
app/(public)/         → Web pública comercial (SSR/ISR, PublicContext)
app/(auth)/panel/     → Backoffice (AuthenticatedContext, sesión JWT)
app/api/v1/           → API pública versionada (ApiKeyContext, rate limit)
app/api/internal/     → Endpoints del backoffice (requireAuth)

src/features/         → Módulos de negocio: catalog, promociones, leads, engagement, contact, contenidos, seo, home, detail, favorites, api-public, api-keys, backoffice, team
src/infrastructure/   → DB (Drizzle + repos), auth, email, media, rate-limiting, tenant, slug
src/shared/           → Tipos, constantes, componentes UI, utils, schemas
```

**Patrón central preservado:** `TenantContext → TenantAwareRepository → transacción con SET LOCAL`. Los tres contextos concretos (`PublicContext`, `AuthenticatedContext`, `ApiKeyContext`) aplican filtros obligatorios a nivel de repositorio, no de endpoint.

**Evolución desde la auditoría anterior:**
- `PromocionPublishService` extraído del PATCH route handler — el handler ahora es HTTP puro.
- `findDetailBySlug()` paraleliza las cuatro queries con `Promise.all` — eliminado el problema de queries secuenciales.
- `validateStatusTransition` movida a `shared/types/lead-schema.ts` — el repositorio ya no valida dominio.
- `createInstitutionalLead` ahora usa `EmailService.enqueue()` — eliminada la inserción directa.
- `CatalogRepository` separado de `PromocionRepository` para SRP en paginación pública.

### Fortalezas

- **Tres superficies bien aisladas** con mecanismos de autenticación diferentes y sin solapamiento.
- **Resiliencia a fallos externos:** email encolado en transacción, rate limiting con degraded mode, Turnstile con bypass en dev.
- **Tests de aislamiento bloqueantes en CI** — garantía formal del modelo multi-tenant.
- **API pública versionada con tests de contrato** — ruptura de schema bloqueante en CI.

### Debilidades

- **Los repositorios más críticos siguen creciendo.** `PromocionRepository` (699 líneas) sigue siendo responsable de CRUD, tipologías sync, history recording, detail assembly y cursor pagination. `LeadRepository` (593 líneas) mezcla lecturas con múltiples filtros de rol, escrituras, notas, read marks y exportación CSV.
- **`create-lead-action.ts` inserta directamente en `email_queue`** mientras `createInstitutionalLead` usa `EmailService.enqueue()`. Dos rutas de encolado de emails con lógica divergente.
- **No hay service layer formal** entre los route handlers de `app/api/internal/` y los repositorios. `PromocionPublishService` es la excepción, no la regla. El patrón no se ha propagado a leads, contenidos ni media.

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | `create-lead-action.ts` inserta en `email_queue` directamente en lugar de `EmailService.enqueue()` | `src/features/engagement/server/create-lead-action.ts` | Medio |
| A2 | `PromocionRepository` acumula CRUD + tipologías + history + detail + cursor | `src/infrastructure/db/repositories/promocion.repository.ts` | Alto |
| A3 | `LeadRepository` acumula lecturas multi-rol + escrituras + notas + read marks + CSV export | `src/infrastructure/db/repositories/lead.repository.ts` | Alto |

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] PromocionRepository: cinco razones para cambiar
**Problema:** `PromocionRepository` (699 líneas) tiene cinco responsabilidades distintas: (1) CRUD básico (`findById`, `create`, `delete`, `update`); (2) ensamblado del detalle público (`findDetailBySlug`), que hace cuatro queries en paralelo; (3) sincronización de tipologías vía `TipologiaSyncService`; (4) registro de historial vía `PromocionHistoryRepository`; (5) cursor pagination para el backoffice (`findAllWithCursor`). La separación de `CatalogRepository` fue un paso en la dirección correcta pero el repositorio principal sigue creciendo.
**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts`
**Impacto:** Un cambio en el formato del historial, en el esquema de tipologías o en el cursor obliga a tocar el mismo archivo. El método `update()` mezcla validación, diff, history recording, tipologías sync y persistencia.
**Prioridad:** Planificar
**Acción concreta:** Extraer `PromocionDetailRepository` con `findDetailBySlug` (responsabilidad: ensamblado del detalle público). El cursor pagination ya está en `findAllWithCursor` dentro del mismo repo — considerar moverlo a `CatalogRepository`. El `update()` puede simplificarse si el history recording se orquesta en el service layer.

#### [SRP-02] LeadRepository: cuatro razones para cambiar
**Problema:** `LeadRepository` (593 líneas) contiene: (1) queries de lectura paginadas con filtros complejos según rol; (2) escritura (create, updateStatus, addNote, reassign); (3) lectura/escritura de read marks (`markAsRead`, `getUnreadCount`); (4) exportación CSV (`exportCsv`). La exportación CSV especialmente es un concern que no pertenece al repositorio — tiene lógica de presentación (el formato CSV lo genera la action, pero el repositorio ya aplica filtros por rol para el export que son distintos a los de la lista normal).
**Archivos afectados:** `src/infrastructure/db/repositories/lead.repository.ts`
**Impacto:** Medio. Funcional y bien testeado, pero cambiar la estrategia de export (ej. generar un CSV a R2 en lugar de devolver filas) obliga a tocar el repositorio.
**Prioridad:** Posponer
**Acción concreta:** Si el export evoluciona (paginación del export, subida a R2), separar `LeadExportRepository`. Por ahora, no urgente.

### OCP — Open/Closed Principle

No hay violaciones relevantes. El sistema de bloques editoriales usa un switch explícito sobre `ContentBlockType` con 5 casos — no hay expectativa de extensión frecuente, el switch es la opción más legible.

### LSP — Liskov Substitution Principle

No hay violaciones. Los tres contextos extienden `TenantContext` correctamente. `AuthenticatedContext.withTransaction()` añade `SET LOCAL app.current_user_id` sobre el comportamiento del padre — extensión compatible.

### ISP — Interface Segregation Principle

No hay violaciones relevantes. Los tipos de repositorio son concretos.

### DIP — Dependency Inversion Principle

#### [DIP-01] `create-lead-action.ts` depende de `email_queue` directamente (violación leve)
**Problema:** `createLeadService` inserta en `emailQueue` con `tx.insert(emailQueue).values({...})` en lugar de delegar en `EmailService.enqueue()`. `createInstitutionalLead` ya lo hace correctamente usando el servicio.
**Archivos afectados:** `src/features/engagement/server/create-lead-action.ts:188-207`
**Impacto:** Si cambia el esquema de `email_queue` (ej. se añade `tenant_id`) o la lógica de validación del template, hay que actualizar dos rutas de código distintas. Actualmente `email_queue` no lleva `tenant_id` (correcto según architecture.md §6.5), pero la duplicación de lógica de encolado es un riesgo latente.
**Prioridad:** Planificar
**Acción concreta:** Refactorizar `createLeadService` para usar `emailService.enqueue()` dentro de la misma transacción, igual que hace `createInstitutionalLead`. Requiere inyectar o instanciar `EmailService` dentro de `createLeadService`. Ver R-01.

---

## 4. YAGNI

### Código innecesario

No hay código muerto significativo. El proyecto está limpio.

### Abstracciones aceptadas (no refactorizar)

#### `TenantAwareRepository` (9 líneas)
Una clase abstracta de 9 líneas que solo delega `withTransaction()`. No refactorizar: documenta la intención del patrón y el coste de eliminarla (14 repositorios) supera el beneficio.

### Código eliminable

| Código | Motivo | Riesgo de eliminar |
|--------|--------|--------------------|
| `src/context/.gitkeep` | Carpeta vacía, el estado global vive en los contextos de tenant | Muy bajo |
| Rama `LegacyCatalogPage` en `app/(auth)/panel/catalogo/page.tsx` (líneas 244-296) | El catálogo ya tiene cursor pagination. La rama de offset solo se activa sin `?cursor=`. Se puede eliminar una vez que el cursor es la ruta predeterminada. | Bajo |

---

## 5. KISS

### Complejidad accidental

#### [KISS-01] Doble rama de paginación en el catálogo del backoffice
**Problema:** `app/(auth)/panel/catalogo/page.tsx` tiene dos ramas: `CursorCatalogPage` (cursor) y `LegacyCatalogPage` (offset/legacy). La rama legacy se activa cuando no hay `?cursor=` en la URL — lo que ocurre en la primera carga. El efecto es que la primera página siempre usa OFFSET y las páginas siguientes usan cursor. Este estado transitorio fue documentado como solución temporal pero no se ha completado la migración.
**Archivos afectados:** `app/(auth)/panel/catalogo/page.tsx`
**Impacto:** Bajo. La primera carga usa OFFSET. Con pocos centenares de promociones el impacto es imperceptible. Pero el código duplicado es confuso.
**Prioridad:** Planificar
**Acción concreta:** Hacer que la primera carga también use cursor (cursor=vacío) y eliminar `LegacyCatalogPage` y `findAll()` con offset del repositorio.

#### [KISS-02] `catalog-filters.tsx` del backoffice usa inputs de texto libre para isla/municipio
**Problema:** El filtro de isla y municipio del backoffice (`catalog-filters.tsx`) es un `<input type="text">` libre, mientras que el catálogo público usa selectores contra `ISLANDS`/`MUNICIPALITIES`. Esto es intencionalmente flexible (el backoffice puede filtrar parcialmente), pero puede generar resultados vacíos si el operador escribe "tenerife" en lugar de "Tenerife".
**Archivos afectados:** `src/features/promociones/components/catalog-filters.tsx:178-204`
**Impacto:** Bajo. UX inconsistente, no un problema de lógica.
**Prioridad:** Posponer
**Acción concreta:** Si se observan quejas de operadores, cambiar a `<select>` usando `ISLANDS`/`MUNICIPALITIES`. No urgente.

### Simplificaciones posibles

- Eliminar `findAll()` con OFFSET del `PromocionRepository` una vez que la primera carga del catálogo backoffice use cursor.
- Consolidar las dos ramas del catálogo del backoffice en una sola función.

---

## 6. DRY

### Duplicaciones relevantes

#### [DRY-01] Dos rutas de encolado de emails con lógica divergente
**Problema:** `createLeadService` (engagement) inserta en `email_queue` directamente. `createInstitutionalLead` (api-public) usa `EmailService.enqueue()`. Si se cambia la lógica de validación de templates o el esquema de cola, hay que actualizar ambas rutas.
**Archivos afectados:**
- `src/features/engagement/server/create-lead-action.ts:188-207` (inserción directa)
- `src/features/api-public/server/create-institutional-lead.ts:96-107` (EmailService.enqueue)
**Impacto:** Medio. Mientras el esquema no cambie, el riesgo es bajo. Pero la inconsistencia es un smell.
**Prioridad:** Planificar

#### [DRY-02] `LABEL_STYLE`, `INPUT_BASE`, `SELECT_STYLE` duplicados en múltiples componentes del backoffice
**Problema:** Las constantes de estilo CSS como `LABEL_STYLE = "font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"` aparecen literalmente en `promocion-section-identity.tsx`, `promocion-section-commercial-status.tsx`, `tipologia-editor.tsx` y `catalog-filters.tsx`.
**Impacto:** Bajo. Cambiar el estilo de label del backoffice requiere buscar en 4 archivos.
**Prioridad:** Posponer
**Acción concreta:** Extraer a `src/shared/styles/backoffice-form.ts`. El beneficio es marginal — no urgente, pero si se añaden más secciones del formulario, hacerlo antes de que sean 8 archivos.

### Duplicaciones aceptables

- **Validación client/server de bloques editoriales:** La validación del cliente en `BlocksEditor` y la del servidor en los server actions usan el mismo schema Zod pero con propósitos distintos (UX vs seguridad). No unificar — eliminar la validación server sería un anti-patrón de seguridad.
- **Tres componentes de formulario de contacto** (`ContactForm` en engagement, `ContactFormGeneric` en contenidos, `contact-form` en leads): los tres sirven propósitos y actions distintos. La estructura visual similar es incidental. No unificar — el coste de un `ContactFormLayout` compartido supera el beneficio dado que cada uno tiene campos distintos (uno incluye tipología, otro no; uno incluye Turnstile, otro es interno).

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo | Severidad |
|---|-------|-----------|------|-----------|
| S1 | PromocionRepository: 699 líneas, 5 responsabilidades | `src/infrastructure/db/repositories/promocion.repository.ts` | God Class | Alta |
| S2 | LeadRepository: 593 líneas, 4 responsabilidades | `src/infrastructure/db/repositories/lead.repository.ts` | God Class | Alta |
| S3 | BlocksEditor: 759 líneas, mezcla estado + drag&drop + validación + renderizado | `src/features/promociones/components/blocks-editor.tsx` | God Component | Media |
| S4 | TipologiaEditor: 579 líneas, múltiples sub-editores | `src/features/promociones/components/tipologia-editor.tsx` | God Component | Media |
| S5 | Inserción directa en email_queue en lugar de EmailService | `src/features/engagement/server/create-lead-action.ts:188-207` | Feature Envy / DRY | Media |
| S6 | `LegacyCatalogPage` — rama de offset obsoleta con duplicación de UI | `app/(auth)/panel/catalogo/page.tsx:244-296` | Dead Code | Baja |
| S7 | Favoritos carga 100 promociones para filtrar en cliente | `app/(public)/favoritos/page.tsx` | Performance | Baja |
| S8 | `LABEL_STYLE`/`INPUT_BASE` duplicados en 4+ componentes backoffice | múltiples | Magic Strings | Baja |
| S9 | `KIND_LABELS` duplicado: en `catalog-list.tsx` y posiblemente otros | `src/features/promociones/components/catalog-list.tsx:44` | DRY | Baja |
| S10 | `get-detail-data.ts` mezcla SEO + structured data + fallbacks | `src/features/detail/server/get-detail-data.ts` | God Module | Baja |

### Clasificación por severidad
- **Alta:** S1, S2
- **Media:** S3, S4, S5
- **Baja:** S6, S7, S8, S9, S10

### Prioridad
- **Hacer de inmediato:** ninguno crítico pendiente
- **Planificar:** S1 (PromocionRepository), S5 (email inconsistency), S6 (rama legacy)
- **Posponer:** S2 (LeadRepository), S3, S4 (UI components), S7, S8, S9, S10

---

## 8. Testing

### Estado

Infraestructura de testing madura, multicapa y bien organizada:
- **Unit tests** co-locados (`*.spec.ts`) y en `tests/unit/`.
- **Integration tests** en `tests/integration/` cubriendo operaciones completas de negocio.
- **Isolation tests** en `tests/isolation/` verificando aislamiento RLS entre dos tenants sintéticos.
- **Contract tests** en `tests/contract/v1/` con snapshots JSON — bloquean CI si el schema de la API pública diverge.
- **E2E tests** en `tests/e2e/` con Playwright y Page Object Model.
- **Feature tests** en `tests/features/` para componentes UI.

### Calidad

Alta. Los tests son específicos, asertivos y no están acoplados a implementación interna. El test `create-lead-action.spec.ts` verifica que `textAccepted` almacena exactamente `RGPD_CONSENT_TEXT_LEAD` — un patrón excelente de test de invariante RGPD. Los tests de aislamiento multi-tenant son bloqueantes y verifican formalmente la propiedad más importante del sistema.

### Nuevas coberturas desde la auditoría anterior

- Tests para `createLeadService` verificando consentimiento RGPD.
- Tests para `getServerSession` con sesión nula, usuario sin id, y usuario con name null.
- `turnstile.spec.ts` cubre degraded mode (sin clave configurada), token nulo, y token inválido.

### Cobertura — gaps pendientes

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| `PromocionPublishService` no tiene tests unitarios directos para `prepareUpdateData()`, `convertLocationFields()`, `validateBlocksOnPublish()`, `validateMediaOnPublish()` | Alto — el servicio extraído debería ser el más testeado | Alta |
| `createLeadService` no verifica que los emails encolados van al agente correcto (solo verifica éxito) | Medio | Media |
| La rama `LegacyCatalogPage` en el catálogo del backoffice no tiene tests | Bajo (rama a eliminar) | Baja |
| Tests E2E para el flujo completo Turnstile: ¿qué ocurre si el token expira entre renderizado y submit? | Bajo (degraded mode cubre dev) | Baja |

### Mejoras

| Mejora | Prioridad | Coste |
|--------|-----------|-------|
| Tests unitarios para cada método de `PromocionPublishService` | Alta | 3h |
| Test de integración que verifica que los emails encolados desde `createLeadService` van al agente asignado | Media | 1h |
| Test que verifica que la eliminación de branch legacy no rompe la primera carga del catálogo | Baja | 1h |

---

## 9. Seguridad

### [SEC-MED-01] Turnstile en modo degradado en producción sin TURNSTILE_SECRET_KEY
**Criticidad:** Medium
**Archivo:** `src/shared/utils/turnstile.ts:28-39`
**Problema:** Si `TURNSTILE_SECRET_KEY` no está configurada y `NODE_ENV !== 'development'`, la función devuelve `{ success: false }`. Este es el comportamiento correcto. Pero si por error la variable se omite en un despliegue de producción, los formularios simplemente fallarán sin mensaje de alerta al equipo. No hay telemetría que alerte de la configuración incorrecta.
**Fix:** Añadir un log de error a Sentry (o al logger) cuando `TURNSTILE_SECRET_KEY` está ausente en producción. La degradación silenciosa en errores de configuración es difícil de depurar.

### Seguridad — aspectos positivos verificados en esta revisión

- **Turnstile correctamente integrado:** `TURNSTILE_SECRET_KEY` nunca se expone al cliente, la verificación ocurre server-side, el widget usa `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (solo public key al cliente).
- **No hay secretos en el código fuente.** Todas las credenciales en variables de entorno. `.env.example` incluye las nuevas variables de Turnstile.
- **Validación Zod en todos los boundaries** incluyendo los nuevos formularios con Turnstile.
- **Rate limiting** en login y formularios públicos, independiente de Turnstile (capas de defensa en profundidad).
- **RLS activado en todas las tablas de dominio** con policies de aislamiento por tenant.
- **Consentimiento RGPD** en la misma transacción que la creación del lead, con test que verifica la constante canónica.
- **Modo de privacidad del mapa** respetado en serialización — `ApiKeyContext` filtra coordenadas exactas.

---

## 10. Performance

### [P-HIGH-01] Primera carga del catálogo backoffice sigue usando OFFSET
**Problema:** `app/(auth)/panel/catalogo/page.tsx` solo activa cursor pagination cuando hay un parámetro `?cursor=` en la URL. La primera carga (sin cursor) cae en la rama legacy con `repo.findAll(filters, page, limit)` que usa `OFFSET`. Con un catálogo pequeño el impacto es imperceptible, pero es una inconsistencia de implementación respecto a la intención declarada.
**Archivos afectados:** `app/(auth)/panel/catalogo/page.tsx:128-164`, `src/infrastructure/db/repositories/promocion.repository.ts:187-250`
**Fix recomendado:** Cambiar la lógica para que la ausencia de cursor signifique "primer cursor" (vacío), activando siempre `findAllWithCursor`. Eliminar la rama legacy y el método `findAll()` con OFFSET.

### [P-MED-01] Favoritos carga hasta 100 promociones para filtrar en cliente
**Problema:** `FavoritosPage` carga `getCatalogData({ limit: 100, sort: "published" })` y pasa todos los ítems al cliente, donde `FavoritesView` filtra por IDs de localStorage. Hay un comentario explícito de deuda técnica en el código.
**Archivos afectados:** `app/(public)/favoritos/page.tsx:21`
**Fix recomendado:** Invertir el flujo: `FavoritesView` lee los IDs de localStorage en el cliente y hace una request a un endpoint público `/api/public/promociones?ids=...` con los IDs. Solo se cargan los datos necesarios. Relevante cuando el catálogo supere ~100 promociones publicadas.

### [P-LOW-01] Función `transformToString` declarada antes de sus imports en blocks-editor.tsx
**Problema:** En `blocks-editor.tsx` la función `transformToString` está declarada antes de la sentencia `import { cn } ...` (línea 28), lo que no es un error de runtime (JS hoisting) pero sí es un smell de organización que puede confundir lectores.
**Archivos afectados:** `src/features/promociones/components/blocks-editor.tsx:24-28`
**Fix recomendado:** Mover la función después de todos los imports. Trivial.

---

## 11. Deuda Técnica

### Crítica (bloquea producción o seguridad)

Ninguna. No hay deuda crítica.

### Alta

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | Tests unitarios para `PromocionPublishService` — el servicio extraído no tiene cobertura directa | 3h |
| DT-02 | Primera carga del catálogo backoffice usa OFFSET en lugar de cursor | 2h |

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-03 | Unificar encolado de emails en `createLeadService` para usar `EmailService.enqueue()` | 2h |
| DT-04 | Extraer `PromocionDetailRepository` de `PromocionRepository` | 4h |
| DT-05 | Alertar en Sentry/logger cuando `TURNSTILE_SECRET_KEY` está ausente en producción | 0.5h |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-06 | Eliminar `LegacyCatalogPage` y `findAll()` con OFFSET una vez DT-02 esté completo | 1h |
| DT-07 | Favoritos: invertir el flujo de carga (client-first, fetch por IDs) | 4h |
| DT-08 | Extraer constantes de estilo backoffice (`LABEL_STYLE`, `INPUT_BASE`) a `shared/styles/` | 1h |
| DT-09 | Mover `transformToString` en blocks-editor.tsx a su posición correcta (post-imports) | 0.1h |
| DT-10 | `catalog-filters.tsx` del backoffice: inputs de texto libre para isla/municipio vs selectores | 2h |

---

## 12. Quick Wins

> Cambios < 2h, seguros de forma independiente, alto impacto.

### QW-01 — Alertar cuando TURNSTILE_SECRET_KEY está ausente en producción (~0.5h)

En `src/shared/utils/turnstile.ts`, añadir antes del `return { success: false }`:

```typescript
if (!secretKey) {
  if (process.env.NODE_ENV === "development") {
    console.warn("[Domio] TURNSTILE_SECRET_KEY not configured. CAPTCHA verification skipped.");
    return { success: true };
  }
  // In production, log the misconfiguration to Sentry/observability
  logger.error("[Domio] TURNSTILE_SECRET_KEY is not set in production environment.");
  return { success: false, error: "CAPTCHA no configurado. Contacta con el administrador." };
}
```

### QW-02 — Mover `transformToString` después de los imports en blocks-editor.tsx (~0.1h)

Mover la función `transformToString` (líneas 24-27) a después del bloque de imports (línea 48+). Puramente cosmético pero mejora la legibilidad.

### QW-03 — Completar la migración a cursor en la primera carga del catálogo backoffice (~2h)

En `app/(auth)/panel/catalogo/page.tsx`, hacer que la ausencia de `?cursor=` active `findAllWithCursor` con cursor vacío (`cursor = ""`), en lugar de caer en la rama de OFFSET. Eliminar `LegacyCatalogPage` y dejar solo `CursorCatalogPage`. Actualizar `PromocionRepository` para que `findAll()` sea private o eliminarlo.

---

## 13. Refactors Estratégicos

### R-01 — Unificar encolado de emails en createLeadService con EmailService

**Valor:** Elimina la divergencia entre dos rutas de encolado de emails. Cuando cambie el esquema de `email_queue` o la lógica de validación de templates, habrá un solo punto de cambio.
**Cambio concreto:** En `createLeadService`, reemplazar los dos `tx.insert(emailQueue).values({...})` por llamadas a `emailService.enqueue({...}, tx)`. Requiere instanciar `EmailService` dentro de `createLeadService` o recibirlo como parámetro (para testabilidad).
**Coste:** 2h. **Riesgo de regresión:** Bajo. El comportamiento es equivalente, `EmailService.enqueue()` ya acepta una transacción como segundo parámetro.

### R-02 — Escribir tests unitarios para PromocionPublishService

**Valor:** `PromocionPublishService` fue extraído precisamente para ser testeable de forma aislada, pero aún no tiene tests propios. Esto crea una situación donde el refactor beneficioso no tiene cobertura que garantice su corrección futura.
**Tests a escribir:**
- `prepareUpdateData()`: verifica slug generation en primer publish, merge de draftPayload, sin slug en updates no-publish.
- `convertLocationFields()`: verifica conversión `{lng,lat}` → `[lng,lat]`.
- `validateBlocksOnPublish()`: verifica que no valida si no está publicando, y que devuelve errores correctamente.
- `validateMediaOnPublish()`: verifica que no valida si no está publicando.
**Coste:** 3h. **Riesgo de regresión:** Ninguno (solo añade tests).

### R-03 — Completar cursor pagination en catálogo backoffice (DT-02 + DT-06)

**Valor:** Elimina la inconsistencia de que la primera página usa OFFSET y las siguientes usan cursor. Simplifica el código de la página (una sola rama en lugar de dos).
**Separación propuesta:**
1. Modificar `findAllWithCursor` para aceptar `cursor = ""` como primer cursor.
2. En la página, eliminar la rama `LegacyCatalogPage` y hacer que `CursorCatalogPage` sea la única ruta.
3. Marcar `findAll()` en `PromocionRepository` como `@deprecated` y eliminar en siguiente ciclo.
**Coste:** 2h. **Riesgo de regresión:** Bajo. El cursor pagination ya está implementado y testeado.

---

## 14. Refactors NO recomendados

### No refactorizar: TenantAwareRepository

Clase abstracta de 9 líneas que documenta el patrón. Coste de eliminarla (14 repositorios) > beneficio. Mantener.

### No refactorizar: Componentes UI grandes del backoffice (BlocksEditor, TipologiaEditor)

`BlocksEditor` (759 líneas) y `TipologiaEditor` (579 líneas) son componentes grandes pero internamente cohesivos: tienen sub-componentes bien definidos, hooks extraídos, y constantes CSS. Dividirlos crearía más archivos sin reducir la complejidad real de los usuarios. El umbral de 500 líneas es una guía; la cohesión interna alta justifica la excepción.

### No refactorizar: LeadRepository (a corto plazo)

`LeadRepository` (593 líneas) mezcla responsabilidades, pero el código es legible y bien testeado. El coste de separarlo ahora (riesgo de romper transacciones atómicas) supera el beneficio. Solo refactorizar si crece >700 líneas o si emerge un nuevo caso de uso que haga el refactor obligatorio.

### No extraer: LABEL_STYLE a un sistema de estilos global

Extraer las constantes de clase CSS a un `shared/styles.ts` tentaría hacia un sistema de estilos global que Tailwind ya gestiona. La duplicación es incidental — cada componente puede evolucionar sus estilos de forma independiente.

### No unificar: Formularios de contacto (ContactForm, ContactFormGeneric, contact-form)

Los tres formularios tienen propósitos distintos (lead de engagement con tipología, formulario genérico de contacto público, formulario de lead desde panel). Un `ContactFormLayout` compartido crearía acoplamiento entre features que actualmente evolucionan independientemente.

### No refactorizar: Inserción directa en email_queue en createLeadService (urgente pero con riesgo)

La refactorización R-01 es deseable pero la inserción directa funciona correctamente hoy. No refactorizar en un hotfix; hacerlo en un ciclo planificado con tests antes y después.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)
- [x] [QW-01] Alertar cuando `TURNSTILE_SECRET_KEY` está ausente en producción — 0.5h
- [x] [QW-02] Mover `transformToString` después de imports en blocks-editor.tsx — 0.1h
- [x] [DT-01] Tests unitarios para `PromocionPublishService` — 3h
- [x] [QW-03] Completar cursor pagination en primera carga del catálogo backoffice — 2h

### Fase 2 — Corto plazo (próximo mes)
- [x] [R-01] Unificar `createLeadService` con `EmailService.enqueue()` — 2h
- [x] [DT-06] Eliminar `LegacyCatalogPage` y `findAll()` con OFFSET (tras QW-03) — 1h
- [x] [DT-05] Alertar en logger cuando TURNSTILE_SECRET_KEY ausente en producción — 0.5h

### Fase 3 — Medio plazo (próximo trimestre)
- [x] [DT-04] Extraer `PromocionDetailRepository` de `PromocionRepository` — 4h
- [x] [DT-07] Favoritos: invertir flujo (client-first, fetch por IDs) cuando catálogo supere 100 — 4h
- [x] [DT-08] Extraer constantes de estilo backoffice a `shared/styles/backoffice-form.ts` — 1h

### No planificado
- Refactor completo de `LeadRepository` — coste > beneficio a corto plazo
- División de `BlocksEditor` y `TipologiaEditor` — cohesión interna alta, no justificado
- `ContactFormLayout` compartido — introduce acoplamiento entre features independientes

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 9 | Multi-tenant riguroso, tres superficies bien separadas, `PromocionPublishService` extraído. Falta service layer formal en leads y contenidos. |
| Simplicidad | 8 | Rama legacy del catálogo es ruido. Sin magic strings en los paths críticos. Componentes UI grandes pero cohesivos. |
| Mantenibilidad | 8 | Repositorios grandes pero bien organizados internamente. Validación de transiciones fuera del repositorio. Inconsistencia en encolado de emails. |
| Cohesión | 8 | Feature modules bien delimitados. Server/client separation respetada. `CatalogRepository` y `PromocionRepository` correctamente separados. |
| Acoplamiento | 8 | DIP respetado. Una violación leve (inserción directa en email_queue). Sin dependencias circulares. |
| Legibilidad | 9 | Código limpio, bien comentado, naming consistente. JSDoc donde aporta valor. |
| Calidad del diseño | 9 | Cursor pagination, RLS por diseño, cola persistente, tests de contrato, Turnstile bien encapsulado. |
| Testing | 9 | Unit, integration, isolation, contract, E2E. Tests de aislamiento multi-tenant bloqueantes. POM. Cobertura de RGPD. Gap en PromocionPublishService. |
| Seguridad | 9 | Turnstile bien integrado, validación Zod en todos los boundaries, RLS, rate limiting, consentimiento RGPD. Un issue medio (telemetría de configuración incorrecta). |
| Deuda técnica | 6 | Rama legacy de paginación pendiente de eliminar. PromocionPublishService sin tests. Inconsistencia en encolado de emails. Sin deuda crítica. |
| **Total** | **83/100** | **Calificación B+** |

**Calificación:** B+

**Justificación:** Domio merece un B+ sólido. Desde la auditoría anterior (B, 78 puntos) el equipo ha aplicado todos los quick wins y los refactors estratégicos más importantes: `PromocionPublishService` extraído y separado correctamente, cursor pagination implementado (aunque incompleto en la primera carga), validación de transiciones de estado en el dominio correcto, Turnstile integrado de forma profesional, constantes centralizadas. Los 17 puntos que faltan para un A vienen de: (1) deuda de tests en `PromocionPublishService` — el servicio existe pero no está cubierto directamente; (2) inconsistencia en el encolado de emails entre las dos rutas de creación de lead; (3) primera carga del catálogo backoffice que aún usa OFFSET; (4) repositorios que siguen creciendo. Subir a A requiere ejecutar los items de Fase 1 y R-01. Subir a A+ requeriría además completar la separación de responsabilidades en `PromocionRepository` y un service layer formal en leads.
