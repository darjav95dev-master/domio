# Feature 008 · Rate Limiting & Observability

> **Spec status:** Draft
> **Feature number:** 008
> **Size:** S (1–2 días)
> **Dependencies:** F001 (bootstrap-project)
> **Author:** orchestrator + feature-briefer
> **Date:** 2026-07-08

---

## Resumen

Proteger las superficies públicas de Domio (API pública y formularios) contra abuso mediante rate limiting con contadores deslizantes, y dotar al sistema de observabilidad en producción con Sentry configurado para capturar errores con contexto de tenant. Esta feature sienta las bases de protección y visibilidad que toda superficie pública posterior requiere.

---

## Motivación

Domio expone una API pública versionada en `/api/v1/` consumida por sistemas externos autenticados por API key, y formularios públicos (login, contacto) que reciben tráfico anónimo. Sin rate limiting, una API key comprometida o una IP maliciosa puede degradar el servicio para todos los consumidores legítimos. Sin observabilidad, los errores en un sistema multi-tenant no son depurables porque falta el contexto de tenant en cada evento (constitution.md §7, architecture.md §7.16).

---

## Alcance

### Incluye

1. **Rate limiting por API key** en todos los endpoints bajo `/api/v1/*`. Los contadores son deslizantes y el límite se lee del campo `rate_limit_per_min` de la tabla `api_keys`.
2. **Rate limiting por IP** en formularios públicos y endpoints de autenticación (login, contacto). Límite configurable.
3. **Degradación graceful**: si el almacén de rate limiting (Upstash Redis / Vercel KV) no responde, se registra alerta en log pero la request se procesa sin bloqueo (architecture.md §1 — servicios externos).
4. **Sentry client + serverless**: configuración con `tracesSampleRate` 0.1 en producción, 1.0 en desarrollo. DSN desde variable de entorno `SENTRY_DSN` (constitution.md §7).
5. **Wrapper de Sentry** que inyecta `tenant_id` como tag en cada evento capturado. Sin contexto de tenant, un error no es depurable (architecture.md §7.16).
6. **Error boundaries en React** que atrapan errores de renderizado, reportan a Sentry con contexto de tenant y muestran un fallback UI digno sin crashear la app.

### Fuera de alcance

- Captcha o challenge visual (vive en F022 como decisión de UX).
- Dashboard de métricas de rate limiting (no existe en el alcance del proyecto — product.md §7).
- Límites por ruta específica más allá de la división API key / IP.
- Configuración de alertas externas (PagerDuty, Slack) ante ataques detectados.
- Rate limiting para webhooks (no existen en Domio — product.md §7).

---

## Requisitos funcionales

### RF-1: Rate limiting por API key

- **Descripción**: Todo endpoint bajo `/api/v1/*` aplica rate limiting basado en la API key autenticada.
- **Límite**: Se lee del campo `rate_limit_per_min` de la tabla `api_keys`. Si el campo es NULL, se aplica un límite por defecto configurable.
- **Algoritmo**: Contador deslizante (sliding window) con granularidad de minutos.
- **Respuesta al exceder**: HTTP 429 Too Many Requests con header `Retry-After` indicando segundos hasta la próxima request permitida.
- **Headers informativos**: Toda respuesta de `/api/v1/*` incluye headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### RF-2: Rate limiting por IP en endpoints sensibles

- **Descripción**: Los endpoints de login (`/api/auth/callback/credentials`) y formulario de contacto público aplican rate limiting por IP del cliente.
- **Límite login**: Máximo 5 intentos fallidos por IP en ventana de 15 minutos. Tras exceder, bloqueo temporal de 15 minutos.
- **Límite contacto**: Máximo 3 envíos por IP en ventana de 10 minutos.
- **Respuesta al exceder**: HTTP 429 con mensaje claro y header `Retry-After`.

### RF-3: Degradación graceful del almacén de rate limiting

- **Descripción**: Si Upstash Redis / Vercel KV no responde (timeout, error de conexión), el sistema registra una alerta en log (nivel `warn`) pero procesa la request sin aplicar límite.
- **Comportamiento**: El rate limiter nunca es bloqueante por fallo propio. La request siempre progresa si el almacén está caído.
- **Trazabilidad**: Cada degradación se registra con timestamp, endpoint afectado y motivo del fallo.

### RF-4: Configuración de Sentry

- **Descripción**: Sentry se configura en modo client (React error tracking) y serverless (API routes, server components, server actions).
- **DSN**: Variable de entorno `SENTRY_DSN`. Si no está definida, Sentry se desactiva silenciosamente (desarrollo local sin DSN).
- **Traces sample rate**: 0.1 en producción (`NODE_ENV=production`), 1.0 en desarrollo.
- **Environment**: Se lee de `NODE_ENV` o `VERCEL_ENV`.
- **Secrets**: Ningún secreto (API keys, passwords, tokens) se envía a Sentry. El wrapper filtra datos sensibles de los breadcrumbs y context.

### RF-5: Inyección de tenant_id en eventos Sentry

- **Descripción**: Todo evento capturado por Sentry lleva el `tenant_id` como tag.
- **Resolución**: El `tenant_id` se obtiene del `TenantContext` activo en el momento del error. Si no hay contexto de tenant (error en middleware antes de resolución), el tag se omite pero el error se captura igualmente.
- **Tags adicionales**: `user_id` (si hay sesión), `role` (si hay sesión), `endpoint` (ruta del API route o server action).
- **Verificación**: Un test unitario verifica que un error lanzado dentro de un `TenantContext` llega a Sentry con el tag `tenant_id` correcto.

### RF-6: Error boundaries en React

- **Descripción**: Componente `ErrorBoundary` que envuelve las rutas públicas y del backoffice. Atrapa errores de renderizado de componentes hijos.
- **Comportamiento**: Muestra un fallback UI digno (no una pantalla en blanco ni un stack trace crudo). El fallback incluye un mensaje comprensible y un botón para reintentar.
- **Reporte a Sentry**: El error se captura y envía a Sentry con contexto de tenant (si está disponible) y el nombre del componente que falló.
- **Reset**: El boundary permite resetear el estado (reintentar render) tras corregir la causa.

---

## Criterios de aceptación

| ID   | Criterio                                                                                                                              | Verificación                                                    |
|------|---------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| CA-1 | Una IP que excede el límite en `/panel/login` recibe HTTP 429 con header `Retry-After`.                                                | Test de integración con contadores en Upstash/KV mockeado.      |
| CA-2 | Una API key que excede su cuota en `/api/v1/*` recibe HTTP 429.                                                                        | Test de integración con rate limit configurable por key.        |
| CA-3 | Si el almacén de rate limiting está caído, las requests pasan sin bloqueo y se genera alerta en log.                                   | Test unitario mockeando fallo de conexión al almacén.           |
| CA-4 | Sentry captura errores con tag `tenant_id` presente cuando hay contexto de tenant activo.                                               | Test unitario que lanza error dentro de TenantContext.          |
| CA-5 | Error boundary renderiza fallback sin crashear la app cuando un componente hijo lanza error.                                            | Test de componente con @testing-library/react.                   |
| CA-6 | El fallback del error boundary incluye mensaje comprensible y botón de reintento.                                                       | Test de componente verifica contenido del fallback.             |
| CA-7 | El DSN de Sentry se lee de variable de entorno; si no está definida, Sentry se desactiva silenciosamente.                               | Test unitario con y sin SENTRY_DSN.                             |
| CA-8 | Headers `X-RateLimit-*` están presentes en toda respuesta de `/api/v1/*`.                                                               | Test de integración verifica headers en respuesta.              |
| CA-9 | Ningún secreto (API keys, passwords, tokens) aparece en eventos o breadcrumbs de Sentry.                                                | Test unitario verifica filtrado de datos sensibles.             |
| CA-10 | `tracesSampleRate` es 0.1 en producción y 1.0 en desarrollo.                                                                          | Test unitario verifica configuración según NODE_ENV.            |

---

## Entidades de datos

| Entidad              | Descripción                                                                                       |
|----------------------|---------------------------------------------------------------------------------------------------|
| RateLimitConfig      | Configuración de límites: default por IP, default por API key, ventanas temporales.               |
| RateLimitResult      | Resultado de verificar un contador: allowed (boolean), remaining (number), resetAt (Date), limit (number). |
| SentryContext        | Contexto enriquecido para Sentry: tenant_id, user_id, role, endpoint.                             |

---

## Escenarios de usuario

### Escenario 1: Consumidor API excede su cuota

Un sistema externo consume `GET /api/v1/promociones` con su API key. La key tiene `rate_limit_per_min = 60`. Tras 60 requests en un minuto, la request 61 recibe HTTP 429 con header `Retry-After: 12`. El consumidor espera y reintenta.

### Escenario 2: IP maliciosa fuerza login

Una IP intenta 6 combinaciones de email/password en `/panel/login` en 5 minutos. El sexto intento recibe HTTP 429. La IP debe esperar 15 minutos antes de poder reintentar. Los 5 intentos fallidos se registran en log.

### Escenario 3: Upstash caído, API sigue operando

El servicio Upstash Redis tiene una interrupción. Las requests a `/api/v1/*` siguen respondiendo normalmente (sin límite de rate). Se genera una alerta en log con nivel `warn` indicando la degradación. Cuando Upstash vuelve, el rate limiting se restablece automáticamente.

### Escenario 4: Error en server action con tenant

Una server action lanza un error inesperado dentro de un contexto de tenant. Sentry captura el error con tags `tenant_id`, `user_id`, `role` y `endpoint`. El equipo de desarrollo puede filtrar errores por tenant en el dashboard de Sentry.

### Escenario 5: Componente falla en render

Un componente de la ficha de promoción lanza un error durante el render (datos inesperados). El error boundary captura el error, lo reporta a Sentry con contexto de tenant, y muestra un fallback con mensaje "Algo salió mal al cargar esta página" y botón "Reintentar".

---

## Suposiciones

- Upstash Redis o Vercel KV ya están disponibles como servicio (el almacén se configura con la variable `RATE_LIMIT_STORE_URL` del `.env.example`).
- La tabla `api_keys` con campo `rate_limit_per_min` ya existe en el schema (creada por F002).
- El `TenantContext` ya está resuelto en middleware (la infraestructura de tenant context se completa en F004, pero el wrapper de Sentry puede funcionar sin él — simplemente omite el tag).
- No hay captcha en esta feature; el rate limiting es la primera línea de defensa. El captcha se añade en F022 si se necesita.
- En desarrollo local sin `RATE_LIMIT_STORE_URL`, el rate limiter se desactiva silenciosamente (como Sentry sin DSN).

---

## Dependencias

| Feature | Relación                                                                 |
|---------|--------------------------------------------------------------------------|
| F001    | Scaffold del proyecto, `.env.example` con `SENTRY_DSN` y `RATE_LIMIT_STORE_URL`, estructura de carpetas. |
| F002    | Schema de `api_keys` con `rate_limit_per_min` (ya existe en el código).  |

---

## Restricciones técnicas

1. **Degradación graceful** (architecture.md §1): el rate limiter nunca bloquea una request por fallo propio del almacén.
2. **DSN en variable de entorno** (constitution.md §7): `SENTRY_DSN` nunca hardcodeado.
3. **Tenant_id en cada evento** (architecture.md §7.16): el wrapper de Sentry inyecta el tag.
4. **Sin secrets en Sentry** (architecture.md §1 "Lo que NO se permite"): filtrar API keys, passwords, tokens de breadcrumbs y context.
5. **Rate limit configurable por key** (architecture.md §4.3): el límite se lee de `api_keys.rate_limit_per_min`.
6. **Scope Rule** (constitution.md §2): el módulo de rate limiting vive en `src/infrastructure/` (servicio externo); el wrapper de Sentry en `src/infrastructure/observability/`; el error boundary en `src/shared/components/`.

---

## Impacto técnico

- **Nuevos archivos**: módulo de rate limiting en `src/infrastructure/rate-limiting/`, configuración de Sentry en `src/infrastructure/observability/`, error boundary en `src/shared/components/error-boundary.tsx`.
- **Dependencias npm**: `@upstash/redis` (o `@vercel/kv`), `@sentry/nextjs`.
- **Variables de entorno**: `SENTRY_DSN`, `RATE_LIMIT_STORE_URL` (ya declaradas en `.env.example`).
- **Middleware**: integración del rate limiter en los middleware de `/api/v1/*` y endpoints sensibles.
- **Layout**: el error boundary envuelve el `{children}` en `app/layout.tsx` o en layouts de superficie.
