# Research: Rate Limiting & Observability

**Feature**: 008 | **Date**: 2026-07-08

---

## R-1: Almacén de rate limiting — Upstash Redis vs Vercel KV

**Decisión**: `@upstash/redis` como dependencia primaria. Vercel KV es un wrapper de Upstash, así que la API es compatible.

**Racional**:
- Upstash ofrece un cliente HTTP REST (`@upstash/redis`) que funciona en Edge Runtime y serverless sin mantener conexiones TCP persistentes — crítico para Vercel serverless.
- Vercel KV es simplemente un Upstash gestionado; usar `@upstash/redis` directamente permite portabilidad si se migra el hosting.
- El algoritmo de sliding window se implementa con dos claves Redis (contador actual + contador anterior) y un `MULTI/EXEC` atómico. No se necesita Redis Lua scripts complejos.

**Alternativas consideradas**:
- `rate-limiter-flexible` (npm) — abstracto pero añade una dependencia que internamente usa Redis. Preferible implementar el sliding window directamente con `@upstash/redis` para tener control total sobre la degradación graceful.
- Middleware de Vercel con `vercel/edge` rate limiting — limitado a Edge Runtime y no soporta rate limiting por API key con configuración variable por key.

---

## R-2: Algoritmo de rate limiting — Sliding Window

**Decisión**: Sliding window counter (ventana deslizante con aproximación por sub-ventanas).

**Racional**:
- Fixed window tiene el problema del burst en el borde (un cliente puede hacer 2x el límite en el cruce de ventanas).
- Sliding window log (registro de cada request) es preciso pero consume memoria proporcional al tráfico.
- Sliding window counter es el balance óptimo: divide la ventana en 2 sub-ventanas (actual y anterior), pondera la anterior por el porcentaje de solapamiento. Precisión suficiente para rate limiting de API con O(1) memoria por key.

**Implementación**:
```
Clave: "rl:{scope}:{identifier}:{window_start}"
window_start = floor(now / window_size) * window_size
count = current_window_count + previous_window_count * overlap_percentage
```

---

## R-3: Sentry en Next.js 15 App Router

**Decisión**: `@sentry/nextjs` SDK oficial con `instrumentation.ts` para inicialización server-side.

**Racional**:
- El SDK `@sentry/nextjs` v8+ soporta App Router nativamente: captura errores de Server Components, Server Actions, Route Handlers y Edge Runtime.
- `instrumentation.ts` en el root del proyecto es el hook de Next.js para inicializar SDKs server-side antes de que se procese cualquier request.
- Client-side se configura vía `sentry.client.config.ts` (convención del SDK).
- El wrapper de `tenant_id` se implementa como una función que llama a `Sentry.setTag('tenant_id', ...)` dentro del contexto de una transacción o server action.

**Alternativas consideradas**:
- Inicialización manual en cada layout — frágil y disperso. `instrumentation.ts` es el punto único de inicialización.
- Custom error tracking sin Sentry — violaría constitution.md §7 que declara Sentry como herramienta obligatoria.

---

## R-4: Error Boundary en React 19 + Next.js App Router

**Decisión**: Componente `ErrorBoundary` como React class component (los error boundaries solo funcionan con class components en React). Integración con `global-error.tsx` de Next.js para errores en el layout raíz.

**Racional**:
- React 19 no ha eliminado los class components para error boundaries — `componentDidCatch` y `getDerivedStateFromError` siguen siendo la API oficial.
- `global-error.tsx` es el hook de Next.js para errores que escapan todos los boundaries (ej: error en el layout raíz). Debe re-renderizar con su propio `<html>` y `<body>`.
- El `ErrorBoundary` envuelve `{children}` en `app/layout.tsx` para capturar errores en toda la app.
- El fallback muestra un mensaje comprensible y botón de reintentar (reset del state del boundary).

**Alternativas consideradas**:
- `react-error-boundary` (npm) — wrapper útil pero añade una dependencia para algo que son ~40 líneas de class component. Preferible implementación propia para control total del fallback y la integración con Sentry.

---

## R-5: Degradación graceful del rate limiter

**Decisión**: Patrón try/catch con fallback a "allow" en cada operación del rate limiter.

**Racional**:
- Si `@upstash/redis` lanza excepción (timeout, connection refused, auth error), el rate limiter captura el error, registra un log con nivel `warn` incluyendo el endpoint y el motivo, y retorna `{ allowed: true }`.
- El consumidor (middleware o route handler) nunca necesita saber si el almacén cayó — la interfaz del rate limiter siempre devuelve un resultado válido.
- Se usa `console.warn` (o el logger de Sentry si está disponible) para la alerta. No se encola ni se reintenta — la degradación es inmediata y el almacén se recupera por sí solo (servicio gestionado).

**Alternativas consideradas**:
- Circuit breaker con estados (closed/open/half-open) — over-engineering para un servicio gestionado que tiene SLA >99.9%. Un simple try/catch es suficiente.
- Cola de requests pendientes durante la caída — añade complejidad innecesaria. La request debe pasar, no esperar.

---

## R-6: Filtrado de secrets en Sentry

**Decisión**: Usar `beforeSend` y `beforeBreadcrumb` hooks del SDK de Sentry para scrub datos sensibles.

**Racional**:
- `beforeSend` intercepta cada evento antes de enviarlo a Sentry. Permite inspeccionar y modificar el payload.
- `beforeBreadcrumb` intercepta cada breadcrumb. Los breadcrumbs pueden contener URLs con query params sensibles o headers con API keys.
- La lista de patrones a filtrar: `password`, `secret`, `token`, `api_key`, `authorization`, `cookie`, `credit_card`. Se aplica regex case-insensitive sobre keys de objetos.
- El `tenant_id` NO es un secreto — es un identificador de negocio que DEBE estar en los eventos (architecture.md §7.16).

**Alternativas consideradas**:
- Confiar en el filtrado por defecto del SDK — insuficiente, puede dejar pasar headers custom o query params.
- No filtrar nada — violaría constitution.md §5 y architecture.md §1 ("Secretos en el código, en el repositorio o en logs de Sentry" está prohibido).
