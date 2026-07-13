# Technical Roadmap — Domio

> Generado por: engineering-auditor
> Fecha: 2026-07-13
> Rama auditada: chore/engenier-auditor
> Trabajo reciente: integración Cloudflare Turnstile, correcciones footer/ubicación, fixes funcionales

---

## 1. Executive Summary

**Score:** 82 — **B+**

**Estado general:** Domio es un proyecto con arquitectura sólida y deliberada. El modelo multi-tenant, la separación en capas (TenantContext, repositorios context-aware, server actions, features), y la cobertura de pruebas muestran un nivel de madurez técnica superior a la media. El trabajo reciente de integración de Turnstile se ha aplicado de forma limpia. Los problemas detectados son localizados y corregibles sin riesgo de regresión significativo. No hay deuda sistémica, solo deuda puntual acumulada durante el sprint de captcha.

**Fortalezas principales:**
- Multi-tenant DNA respetado rigurosamente: `set_config` transaccional, repositorios context-aware, tests de aislamiento RLS bloqueantes.
- Separación de capas muy coherente: public/authenticated/apikey contexts, TenantAwareRepository, feature modules bien delimitados.
- Testing de alta calidad: tests de aislamiento, tests de contrato versionados, pruebas de integración, e2e con Page Object Model.
- Esquema Zod discriminado para bloques editoriales con sanitización XSS en capa de persistencia.
- Queue de email persistente: resiliencia correctamente implementada (crea lead aunque Resend falle).
- Turnstile integrado de forma limpia en ambas rutas críticas de captura de leads.
- Husky con pre-commit (lint + typecheck) y pre-push (test + build) activo.

**Riesgos principales:**
- El texto de consentimiento RGPD se almacena hardcodeado en `create-lead-action.ts` en lugar de consumir `RGPD_CONSENT_TEXT_LEAD`, creando divergencia silenciosa entre lo que el usuario ve y lo que se persiste en `consent_records`.
- El catálogo del backoffice (`PromocionRepository.findAll`) usa paginación con `OFFSET`, violando la regla de cursor obligatorio. Afecta a rendimiento cuando el catálogo crece.
- La página de favoritos carga hasta 100 promociones en el servidor para filtrarlas en el cliente, patrón documentado como deuda pero sin fecha de resolución.
- Duplicación de lógica de formularios de contacto: tres componentes distintos (`ContactForm`, `ContactFormGeneric`, `leads/contact-form`) con overlap parcial y acoplamiento diferente al mismo server action.

---

## 2. Arquitectura

### Estado actual

Domio implementa una arquitectura de tres capas bien delimitadas:

1. **Capa de presentación** — `app/(public)/`, `app/(auth)/panel/`, `app/api/` — Next.js App Router con RSC por defecto. Superficies correctamente separadas por subdominio lógico.
2. **Capa de features** — `src/features/` — lógica de negocio por dominio. Cada feature tiene `components/`, `server/`, `actions/`, `schemas/` y `hooks/` propios. Scope Rule respetada consistentemente.
3. **Capa de infraestructura** — `src/infrastructure/` — acceso a datos (Drizzle + PgBouncer), auth (next-auth v4), email (Resend + cola persistente), media (R2), rate limiting (Upstash), Sentry.

El `TenantContext` como abstracción central es la decisión arquitectónica más importante del proyecto y está bien ejecutada. `set_config('app.current_tenant_id', ?, true)` (equivalente a `SET LOCAL`) se invoca siempre dentro de transacción a través de `TenantContext.withTransaction()`. Los tres contextos (`PublicContext`, `AuthenticatedContext`, `ApiKeyContext`) polimorficamente gestionan los filtros por tenant.

### Fortalezas

- La base del Repository Pattern es sólida: `TenantAwareRepository` como clase abstracta, `withTransaction` encapsulado, sin SQL ad-hoc fuera de repositorios.
- La separación `CatalogRepository` / `PromocionRepository` es correcta desde SRP: razones de cambio distintas (cursor público vs. CRUD backoffice).
- Los tests de aislamiento (`tests/isolation/`) son bloqueantes en CI, verifican la propiedad más crítica del sistema.
- Los tests de contrato (`tests/contract/v1/`) protegen la API pública contra deriva de schema.
- El middleware es conciso y cubre exactamente lo necesario: auth guard, X-Robots-Tag, rate limiting de login.

### Debilidades

- **Paginación dual en backoffice:** `PromocionRepository.findAll` (backoffice) usa `OFFSET`. Solo el catálogo público usa cursor. Cuando el catálogo supere ~500 registros, el backoffice tendrá problemas de rendimiento. La prohibición de `OFFSET` en `architecture.md` es absoluta pero solo se aplica al catálogo público; el backoffice carece de esa protección.
- **Duplicación de paths de captura de lead:** `engagement/server/create-lead-action.ts` y `contact/actions/submit-contact.action.ts` son dos caminos distintos hacia la misma operación de negocio (crear lead / notificar). El primero crea lead completo en BD; el segundo solo encola email sin persistir lead. Esta distinción semántica (lead de ficha vs. contacto genérico sin promoción) es válida, pero el código no la hace explícita y genera confusión sobre cuál usar y cuándo.

### Hallazgos

| ID | Hallazgo | Archivos afectados | Impacto |
|----|----------|--------------------|---------|
| A1 | OFFSET en repositorio de backoffice | `src/infrastructure/db/repositories/promocion.repository.ts:238`, `src/infrastructure/db/repositories/lead.repository.ts:187` | Medio |
| A2 | Carga masiva en favoritos (client-side filter) | `app/(public)/favoritos/page.tsx:21` | Bajo |

---

## 3. SOLID

### SRP — Single Responsibility Principle

#### [SRP-01] `EditPromocionPage` como orquestador excesivamente acoplado

**Problema:** `app/(auth)/panel/catalogo/[id]/page.tsx` (346 líneas) mezcla directamente: auth guard, carga de repositorio (dos repositorios distintos), validación de bloques para publicación, validación de medios para publicación, carga de media assets con join manual, cálculo de `constructionWarning`, carga de agentes con query directa `authCtx.withTransaction(...)`, y composición del JSX. Hay al menos 5 razones distintas para modificar este archivo.

**Archivos afectados:** `app/(auth)/panel/catalogo/[id]/page.tsx`

**Impacto:** Cada nueva validación de publicación, nuevo tipo de asset, o cambio en la lógica de agentes toca este archivo. Pruebas difíciles de escribir (no hay tests unitarios para esta página).

**Prioridad:** Posponer

**Acción concreta:** Extraer `loadMediaAssets`, `computePublishBlocked`, y la query de agentes a funciones de servidor independientes o a un `getPromocionPageData(id, ctx)` que devuelva todos los datos en una llamada compuesta. La lógica de agentes debería vivir en un repositorio de usuarios o en el repositorio de promociones.

#### [SRP-02] `crear-lead-action.ts` con query directa sin repositorio

**Problema:** `createLeadService` en `src/features/engagement/server/create-lead-action.ts` ejecuta queries directas sobre `leads`, `consentRecords`, `emailQueue` y `usuarios` usando `tx.select`, `tx.insert` directamente. Viola el patrón de repositorio obligatorio de `architecture.md §2.3`.

**Archivos afectados:** `src/features/engagement/server/create-lead-action.ts:111-216`

**Impacto:** Los invariantes de la operación (tenant_id, consent, email queue) están dispersos en una función de 100 líneas. La lógica de negocio de creación de lead no es reutilizable y no puede testearse sin mockear el contexto transaccional.

**Prioridad:** Planificar

**Acción concreta:** Mover la lógica de `createLeadService` a `LeadRepository.createFromPublic(data, ip, userAgent)` que encapsule todos los inserts en transacción. El server action queda como validación + llamada al repositorio.

### OCP — Open/Closed Principle

No se detectan violaciones con impacto real. El switch en `BlockFormForType` es cerrado por diseño (5 tipos de bloque fijos por especificación).

### LSP — Liskov Substitution Principle

No se detectan violaciones.

### ISP — Interface Segregation Principle

No se detectan violaciones relevantes.

### DIP — Dependency Inversion Principle

No se detectan violaciones con coste real. Las dependencias concretas (EmailService, EmailRepository) instanciadas directamente en server actions son aceptables en el contexto de Next.js App Router.

---

## 4. YAGNI

### Interfaces innecesarias

No se detectan interfaces con una única implementación que no cambiará.

### Código eliminable

| Código | Motivo | Riesgo de eliminar |
|--------|--------|--------------------|
| `src/features/promociones/components/promocion-form.tsx:69` — prop `initialTipologias` nunca usada | La prop existe en la interfaz `PromocionFormProps` pero no se usa en el cuerpo del componente (los datos llegan via `initialData.tipologias`). Dead prop. | Muy bajo |
| `app/api/internal/promociones/[id]/route.ts:119` — parámetros `_parsedData` y `_current` en `validateMediaOnPublish` y `validateBlocksOnPublish` | Parámetros prefijados con `_` que se reciben pero no se usan. Dead parameters que añaden ruido. | Muy bajo |

### Abstracciones innecesarias

- La función `checkContactRateLimit` en `src/features/contact/actions/contact-form-action.ts` es un wrapper thin de `checkIpRateLimit` con un único uso. Justifica su existencia solo como punto de cambio futuro (ej. cambiar el scope). Aceptable pero borderline.

---

## 5. KISS

### Complejidad accidental

#### [KISS-01] Tres componentes de formulario de contacto con overlap semántico

Existen tres componentes de formulario de contacto con propósitos distintos pero lógica y estructura visualmente similar:

- `src/features/engagement/components/ContactForm.tsx` — formulario de ficha de promoción, crea lead con `promocionId` real. Valida cliente+servidor. Tiene selector de tipología.
- `src/features/leads/components/contact-form.tsx` — formulario de la página `/contacto` del backoffice (bandeja leads), crea lead con `NULL_PROMOCION_ID`. Usa `useTransition` + dynamic import.
- `src/features/contact/components/ContactFormGeneric.tsx` — formulario de la página pública `/contacto`, usa `submitContactForm` (acción diferente que solo encola email sin crear lead).

La distinción entre el segundo y el tercero es sutil y confusa: ambos están en la página de contacto público pero uno crea un lead real y el otro solo envía un email. La capa de contacto genérico en `features/contact` debería unificarse con `features/engagement` o la diferencia semántica (lead con promoción vs. email de contacto sin lead) debe documentarse más claramente en los comentarios del módulo.

**Impacto:** Alta carga cognitiva para developers futuros. Cualquier cambio en el flujo de contacto debe tocar múltiples lugares.

**Prioridad:** Planificar

#### [KISS-02] `promocion-form.tsx` de 554 líneas con reducer y 7 secciones

`PromocionForm` es un componente de 554 líneas que orquesta un reducer, 7 secciones de formulario, autosave, restauración de draft, y validación de publicación. Esta complejidad es inherente al dominio (formulario multi-sección con estado complejo) y está bien encapsulada en hooks (`use-autosave`, `use-draft-restore`, `use-publish-validation`). No requiere refactor urgente, pero cualquier nueva sección aumentará la complejidad.

**Prioridad:** No hacer (complejidad necesaria bien organizada)

### Simplificaciones posibles

- `BlockFormForType` con switch de 5 casos es más simple que un registro de componentes con factory. Correcto.
- `transformToString` implementado manualmente en `blocks-editor.tsx` en lugar de `@dnd-kit/utilities` evita una dependencia. Correcto.

---

## 6. DRY

### Duplicaciones relevantes

#### [DRY-01] Texto de consentimiento RGPD duplicado en persistencia

**Ubicación:** `src/features/engagement/server/create-lead-action.ts:182`

**Problema:** El texto `"He leído y acepto la política de privacidad y el tratamiento de mis datos para recibir información comercial."` está hardcodeado en `createLeadService` al insertar en `consent_records`. La constante canónica existe en `src/shared/constants/consent-texts.ts:RGPD_CONSENT_TEXT_LEAD` y se usa correctamente en los componentes de UI, pero no en la acción de persistencia.

**Impacto real:** Si el texto legal cambia, se actualiza en la constante (UI refleja el cambio) pero no en lo que se persiste en base de datos. Los registros de consentimiento quedan inconsistentes. Esto es un problema RGPD real: `consent_records.text_accepted` debe reflejar exactamente el texto que el usuario aceptó.

**Fix:** Importar `RGPD_CONSENT_TEXT_LEAD` en `create-lead-action.ts` y usar la constante en el insert.

**Prioridad:** Hacer inmediatamente

#### [DRY-02] Texto RGPD inline en `ContactForm.tsx` de engagement

**Ubicación:** `src/features/engagement/components/ContactForm.tsx:288`

**Problema:** El componente de formulario de ficha renderiza el texto de consentimiento como fragmento JSX inline con el link a política de privacidad. El comentario en el código dice `{/* Text sourced from RGPD_CONSENT_TEXT_LEAD */}` pero no importa ni usa la constante. El texto visualmente mostrado al usuario diverge de la constante oficial.

**Impacto real:** El texto que el usuario ve al marcar el checkbox no es exactamente el que está en `RGPD_CONSENT_TEXT_LEAD`. En una auditoría RGPD esto es un riesgo: hay que demostrar que el texto aceptado es el texto almacenado.

**Prioridad:** Hacer inmediatamente

### Duplicaciones aceptables

- La duplicación de clases CSS entre formularios (INPUT_CLASS, LABEL_CLASS) es intencional: cada formulario tiene contexto visual diferente y unificarlas añadiría acoplamiento sin beneficio real.
- Fixtures de `basePromocionRow` en tests son aceptables como duplicación local de datos de prueba.

---

## 7. Code Smells

### Listado completo

| # | Smell | Ubicación | Tipo | Severidad |
|---|-------|-----------|------|-----------|
| S1 | Texto RGPD hardcodeado en persistencia | `create-lead-action.ts:182` | Magic String / DRY | Alta |
| S2 | Texto RGPD inline sin constante en `ContactForm.tsx` | `engagement/components/ContactForm.tsx:288` | Magic String | Alta |
| S3 | Query directa sobre múltiples tablas sin repositorio | `create-lead-action.ts:111-216` | Feature Envy / SRP | Alta |
| S4 | Parámetros muertos `_parsedData`, `_current` | `api/internal/promociones/[id]/route.ts:119,170` | Dead Code | Baja |
| S5 | Prop muerta `initialTipologias` en PromocionForm | `promocion-form.tsx:69` | Dead Code | Baja |
| S6 | OFFSET en repositorio backoffice | `promocion.repository.ts:238`, `lead.repository.ts:187` | Performance / violación arquitectónica | Media |
| S7 | Carga 100 items en favoritos para filtrar en cliente | `favoritos/page.tsx:21` | Performance | Baja |
| S8 | Three contact form components with semantic overlap | `ContactForm.tsx`, `ContactFormGeneric.tsx`, `leads/contact-form.tsx` | Divergent Change | Media |
| S9 | EditPromocionPage excesivamente acoplada | `panel/catalogo/[id]/page.tsx` | God Component (RSC) | Media |

### Clasificación por severidad

- **Alta:** S1, S2, S3
- **Media:** S6, S8, S9
- **Baja:** S4, S5, S7

### Prioridad

- **Hacer de inmediato:** S1, S2
- **Planificar:** S3, S6, S8
- **Posponer:** S9
- **No hacer (ahora):** S4, S5, S7

---

## 8. Testing

### Estado

Infraestructura de testing muy completa:
- **Unit tests** en `src/` con cobertura de componentes, actions, schemas, hooks y repositorios.
- **Integration tests** en `tests/integration/` para operaciones de BD reales (skip si no hay DATABASE_URL).
- **Isolation tests** en `tests/isolation/` — bloqueantes, verifican aislamiento multi-tenant.
- **Contract tests** en `tests/contract/v1/` — versionados con snapshots.
- **E2E tests** en `tests/e2e/` con Page Object Model.
- Coverage thresholds 80% configurados en vitest.

### Calidad

- Los tests de `auth.config.spec.ts` y `session.spec.ts` son tests de superficie (verifican que el módulo exporta, que la estrategia es JWT, que el redirect existe). Aportan poco en términos de comportamiento; no prueban la lógica del `authorize` callback.
- Los tests de `ContactFormGeneric.spec.tsx` son correctos: verifican estructura, accesibilidad y binding de campos.
- Los tests de `contact-form.spec.tsx` (leads) son buenos: verifican que `createLeadAction` recibe los parámetros correctos, incluyendo `NULL_PROMOCION_ID` y el consentimiento.
- El test del texto RGPD (`expect(screen.getByText(RGPD_CONSENT_TEXT_LEAD)).toBeInTheDocument()`) es valioso: detectaría la divergencia si la constante y el componente divergieran.

### Cobertura útil

- **Alta cobertura real:** repositorios (cursor, filtros, aislamiento), schemas Zod (content blocks con XSS), acciones de lead, rate limiting, auth middleware.
- **Cobertura superficial:** `auth.config.spec.ts` — solo verifica propiedades estructurales, no comportamiento del `authorize`.
- **Sin cobertura:** `EditPromocionPage` (RSC sin tests unitarios), `createLeadService` directamente (solo mediante integración).

### Mejoras

| Mejora | Prioridad | Coste |
|--------|-----------|-------|
| Test del authorize callback con credenciales inválidas y usuario inactivo | Media | Bajo |
| Test unitario de `createLeadService` con tx mockeado | Media | Bajo |
| Verificar que `textAccepted` en `consent_records` == `RGPD_CONSENT_TEXT_LEAD` | Alta | Muy bajo |

---

## 9. Seguridad

### [SEC-CRIT-01] Divergencia entre texto visible y texto persistido en consent_records

**Criticidad:** High

**Archivo:** `src/features/engagement/server/create-lead-action.ts:182`

**Problema:** El texto almacenado en `consent_records.text_accepted` está hardcodeado con una cadena literal idéntica (pero no referenciada) a `RGPD_CONSENT_TEXT_LEAD`. Si el equipo legal actualiza la constante y el componente UI la refleja, la capa de persistencia sigue guardando el texto antiguo. Esto invalida la trazabilidad del consentimiento RGPD: no se puede demostrar que el texto aceptado es el texto almacenado.

Adicionalmente, `src/features/engagement/components/ContactForm.tsx` renderiza el texto de consentimiento con JSX inline (no usa la constante `RGPD_CONSENT_TEXT_LEAD`), creando una tercera divergencia potencial.

**Fix:** En `create-lead-action.ts`, importar `RGPD_CONSENT_TEXT_LEAD` de `@/shared/constants/consent-texts` y usar la constante en el valor de `textAccepted`. En `ContactForm.tsx` de engagement, refactorizar el texto inline para usar la constante o estructurarlo de forma que coincida exactamente.

### [SEC-INFO-01] Degraded mode de Turnstile en producción solo si falta secretKey

**Criticidad:** Low

**Archivo:** `src/shared/utils/turnstile.ts:27-37`

**Problema:** Si `TURNSTILE_SECRET_KEY` no está configurada en un entorno que no sea `development`, la función devuelve `{ success: false }`. El comportamiento es correcto y seguro. Sin embargo, el modo degradado en desarrollo (skip silencioso) puede enmascarar configuraciones incorrectas de staging si `NODE_ENV` no se configura bien.

**Fix:** Documentar en `.env.example` que `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` es el test key para development/CI, eliminando la necesidad del bypass por `NODE_ENV`. Así el flujo de verificación siempre se ejercita, incluso en desarrollo.

---

## 10. Performance

### [P-MED-01] OFFSET en paginación del backoffice de catálogo y leads

**Problema:** `PromocionRepository.findAll` y `LeadRepository.findAll` (backoffice) usan `.offset(offset)`. Con 500+ registros, las queries de página tardía (ej. página 20) son O(n) en el motor. La arquitectura documenta cursor como obligatorio pero la prohibición está redactada solo para "catálogo público".

**Archivos afectados:** `src/infrastructure/db/repositories/promocion.repository.ts:238`, `src/infrastructure/db/repositories/lead.repository.ts:187`

**Fix recomendado:** Migrar el backoffice de catálogo a cursor pagination (o al menos a keyset pagination). El backoffice tiene filtros complejos que complican la migración; priorizar cuando el catálogo supere 200 registros publicados.

### [P-LOW-01] Favoritos carga hasta 100 promociones en servidor para filtrar en cliente

**Problema:** `app/(public)/favoritos/page.tsx` hace `getCatalogData({ limit: 100 })` y pasa los 100 items al cliente para filtrar contra `localStorage`. El propio código documenta el problema con un comentario de "ponytail".

**Archivos afectados:** `app/(public)/favoritos/page.tsx:21`

**Fix recomendado:** Cuando el catálogo supere ~80 publicaciones activas, invertir el flujo: leer IDs de `localStorage` en el cliente vía `useEffect` y llamar a un endpoint con `WHERE id IN (...)`. El Server Component actual no puede leer localStorage.

---

## 11. Deuda Técnica

### Crítica (bloquea corrección RGPD)

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-01 | Texto RGPD hardcodeado en create-lead-action.ts no usa la constante RGPD_CONSENT_TEXT_LEAD | 30min |
| DT-02 | ContactForm.tsx de engagement renderiza texto de consentimiento inline sin usar la constante | 30min |

### Alta

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-03 | createLeadService hace queries directas sin repositorio (violación architecture.md §2.3) | 3-4h |
| DT-04 | OFFSET en PromocionRepository.findAll y LeadRepository.findAll (backoffice) | 2-3h por repo |

### Media

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-05 | Tres componentes de formulario de contacto con overlap semántico confuso | 2h (documentación) / 4h (refactor) |
| DT-06 | EditPromocionPage orquesta demasiadas responsabilidades (auth, múltiples repos, validaciones, query directa de agentes) | 3h |

### Baja

| Deuda | Descripción | Effort |
|-------|-------------|--------|
| DT-07 | Prop muerta `initialTipologias` en PromocionForm | 15min |
| DT-08 | Parámetros muertos `_parsedData`, `_current` en helpers de route.ts | 15min |
| DT-09 | Favoritos carga hasta 100 promociones en servidor | 2-3h cuando el catálogo crezca |
| DT-10 | tests de auth.config.spec.ts no prueban el authorize callback | 1h |

---

## 12. Quick Wins

> Cambios < 2h, seguros de forma independiente, alto impacto.

### QW-01 — Usar RGPD_CONSENT_TEXT_LEAD en create-lead-action.ts (~30min)

```typescript
// Antes:
textAccepted:
  "He leído y acepto la política de privacidad y el tratamiento de mis datos para recibir información comercial.",

// Después:
import { RGPD_CONSENT_TEXT_LEAD } from "@/shared/constants/consent-texts";
// ...
textAccepted: RGPD_CONSENT_TEXT_LEAD,
```

Añadir test de integración que verifique que `consent_records.text_accepted === RGPD_CONSENT_TEXT_LEAD` después de crear un lead.

### QW-02 — Eliminar prop muerta `initialTipologias` de PromocionForm (~15min)

La prop `initialTipologias?: TipologiaEditorItem[]` está declarada en `PromocionFormProps` pero nunca se usa dentro del componente. Eliminarla reduce la superficie de la API del componente.

### QW-03 — Eliminar parámetros muertos en route.ts (~15min)

Las funciones `validateMediaOnPublish` y `validateBlocksOnPublish` declaran `_parsedData` y `_current` que nunca se usan. Eliminar esos parámetros simplifica las firmas y elimina ruido.

### QW-04 — Documentar la distinción semántica entre los tres formularios de contacto (~1h)

Añadir comentarios de cabecera precisos en cada uno de los tres componentes explicando qué hace cada uno, qué action invoca y cuándo se usa. Esto no es refactor sino documentación que previene confusión futura. Coste bajo, beneficio real.

### QW-05 — Añadir test de consentimiento en integración (~45min)

```typescript
it("almacena el texto de consentimiento canónico en consent_records", async () => {
  // crear lead via createLeadService
  // verificar que el registro en consent_records tiene textAccepted === RGPD_CONSENT_TEXT_LEAD
});
```

---

## 13. Refactors Estratégicos

### R-01 — Encapsular createLeadService en LeadRepository

**Valor:** Elimina la violación de `architecture.md §2.3` (queries directas fuera de repositorio). Hace la lógica de creación de lead testeable unitariamente con transacción mockeada. Alinea con el patrón del resto del sistema.

**Separación propuesta:**
- Mover `createLeadService` a `LeadRepository.createFromPublicForm(data, ip, userAgent)`.
- El server action `createLeadAction` queda como: Turnstile → Zod → rate limit → `repo.createFromPublicForm(...)`.
- Los tests unitarios existentes de `create-lead-action.spec.ts` mockean el repositorio en lugar del contexto transaccional.

**Coste:** 3-4h. **Riesgo de regresión:** Bajo (tests de integración cubren el flujo).

### R-02 — Unificar la gestión del texto de consentimiento

**Valor:** Garantía RGPD: una sola fuente de verdad para el texto que el usuario ve, el texto que se persiste, y el texto que se testea.

**Separación propuesta:**
1. `create-lead-action.ts`: importar `RGPD_CONSENT_TEXT_LEAD`.
2. `ContactForm.tsx` (engagement): simplificar el JSX del checkbox o añadir un atributo data para tests, pero asegurar que el texto renderizado es derivable de la constante.
3. Añadir test de regresión que compare el texto visible con la constante.

**Coste:** 1h. **Riesgo de regresión:** Muy bajo.

### R-03 — Migrar paginación backoffice a cursor (cuando el catálogo crezca)

**Valor:** Elimina degradación de rendimiento en operaciones de backoffice con catálogos grandes. Alinea el backoffice con la misma estrategia que el catálogo público.

**Coste:** 4-6h. **Riesgo de regresión:** Medio (require tests de paginación del backoffice). **Disparador recomendado:** cuando el catálogo supere 200 registros publicados.

---

## 14. Refactors NO recomendados

### No refactorizar: Separar BlockFormForType en un registro de componentes

El switch de 5 casos en `BlockFormForType` es exactamente la complejidad apropiada para 5 tipos de bloque estáticos definidos por spec. Introducir un registro dinámico de componentes añadiría indirección sin beneficio real. El OCP no aplica aquí porque el conjunto de tipos de bloque es cerrado por definición de producto.

### No refactorizar: Abstraer TurnstileWidget en un HOC genérico

Hay tres formularios que usan `TurnstileWidget`. La tentación de abstraer el "formulario con captcha" en un HOC genérico añadiría complejidad sin beneficio dado que cada formulario tiene una estructura y un action distintos.

### No refactorizar: Unificar ContactFormGeneric con ContactForm de engagement

Aunque visualmente similares, tienen semántica diferente: uno crea un lead persistido en BD (con `promocionId`, `consentRecord`, `email_queue`), el otro solo encola un email de notificación genérica. Forzar su unificación requeriría parametrizar el comportamiento de persistencia, añadiendo complejidad mayor al problema que resuelve. Documentar la distinción (QW-04) tiene más ROI que fusionarlos.

### No refactorizar: TenantAwareRepository como clase abstracta vs. mixin

`TenantAwareRepository` es una clase abstracta de 9 líneas que encapsula `withTransaction`. Aunque pattern-critics señalarían que una clase abstracta con un solo método es excesiva, en TypeScript las herencias de clase son limpias y facilitan el tipado. No hay beneficio en convertirlo a función libre o composición.

### No refactorizar: checkContactRateLimit como wrapper thin

La función solo delega a `checkIpRateLimit` con scope `"contact"`. Podría inlinarse, pero actúa como punto de extensión documentado para rate limiting específico de contacto. Mantenerla tiene valor como punto de cambio futuro con coste cero de mantenerla.

---

## 15. Roadmap de Ejecución

### Fase 1 — Inmediato (esta semana)

- [x] [DT-01 / QW-01] Usar `RGPD_CONSENT_TEXT_LEAD` en `create-lead-action.ts` — 30min
- [x] [DT-02] Revisar texto de consentimiento inline en `ContactForm.tsx` (engagement) — 30min
- [x] [QW-05] Añadir test de integración que verifique `textAccepted === RGPD_CONSENT_TEXT_LEAD` — 45min
- [x] [QW-02] Eliminar prop muerta `initialTipologias` — 15min
- [x] [QW-03] Eliminar parámetros muertos en route.ts — 15min

### Fase 2 — Corto plazo (próximo mes)

- [ ] [R-02] Refactor completo de gestión de consentimiento (test de regresión incluido) — 1h
- [ ] [R-01] Mover `createLeadService` a `LeadRepository.createFromPublicForm` — 3-4h
- [ ] [QW-04] Documentar distinción semántica entre formularios de contacto — 1h
- [ ] [DT-10] Mejorar tests de `auth.config.spec.ts` para probar el authorize callback — 1h

### Fase 3 — Medio plazo (cuando el catálogo crezca)

- [ ] [R-03 / DT-04] Migrar paginación de backoffice a cursor — 4-6h (disparador: >200 registros)
- [ ] [DT-09] Invertir flujo de favoritos (client fetch con IDs) — 2-3h (disparador: >80 publicaciones)
- [ ] [DT-06] Extraer lógica de datos de `EditPromocionPage` a función compuesta — 3h

### No planificado

- Fusión de los tres componentes de formulario de contacto — coste > beneficio, documentación suficiente.
- Abstracción de TurnstileWidget — YAGNI.

---

## 16. Score Final

| Dimensión | /10 | Notas |
|-----------|-----|-------|
| Arquitectura | 9 | Multi-tenant DNA excelente. OFFSET en backoffice es la única violación real. |
| Simplicidad | 7 | Tres formularios de contacto con overlap añaden carga cognitiva innecesaria. |
| Mantenibilidad | 8 | Buena separación en features, pero createLeadService fuera de repositorio rompe el patrón. |
| Cohesión | 8 | Features bien delimitadas. EditPromocionPage algo sobrecargada. |
| Acoplamiento | 8 | Contextos correctamente inyectados. Texto RGPD hardcodeado es el único acoplamiento implícito real. |
| Legibilidad | 9 | Código bien documentado, comentarios útiles, nombres descriptivos. |
| Calidad del diseño | 8 | Repositorios, contexts, schemas Zod discriminados, queue de email: decisiones correctas. |
| Testing | 8 | Suite madura con isolation tests y contract tests. Tests de auth.config algo superficiales. |
| Seguridad | 7 | Turnstile bien integrado. Rate limiting activo. El problema de divergencia de texto RGPD es el riesgo más relevante. |
| Deuda técnica | 8 | Deuda localizada y corregible en horas, no sistémica. |
| **Total** | **80/100** | |

**Calificación: B+**

**Justificación:** Domio es un proyecto técnicamente sólido con decisiones arquitectónicas correctas y una suite de tests que protege sus invariantes más críticos. La calificación no llega a A porque: (1) existe un riesgo de trazabilidad RGPD real (divergencia de texto de consentimiento) que debe corregirse esta semana; (2) `createLeadService` viola el patrón de repositorio que define toda la arquitectura de acceso a datos del proyecto; (3) la paginación con OFFSET en el backoffice es una deuda técnica con impacto de rendimiento futuro. Las tres son corregibles en menos de una jornada de trabajo combinada. Para llegar a A, el proyecto necesita esas correcciones más el refactor de `createLeadService` al repositorio.
