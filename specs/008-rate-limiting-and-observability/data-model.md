# Data Model: Rate Limiting & Observability

**Feature**: 008 | **Date**: 2026-07-08

---

## Entidades

### RateLimitConfig

Configuración inmutable de límites. Se define en constantes centralizadas (`src/shared/constants/`).

| Campo                  | Tipo     | Descripción                                              |
|------------------------|----------|----------------------------------------------------------|
| `defaultApiLimitPerMin`| `number` | Límite por defecto para API keys sin `rate_limit_per_min`|
| `loginMaxAttempts`     | `number` | Máximo de intentos de login por IP (default: 5)          |
| `loginWindowMinutes`   | `number` | Ventana temporal para login (default: 15 min)            |
| `contactMaxAttempts`   | `number` | Máximo de envíos de contacto por IP (default: 3)         |
| `contactWindowMinutes` | `number` | Ventana temporal para contacto (default: 10 min)         |
| `lockoutMinutes`       | `number` | Duración del bloqueo tras exceder límite (default: 15 min)|

**Validación**: Todos los campos son números positivos. Sin valores mágicos en el código — todo se lee de estas constantes.

### RateLimitResult

Resultado de verificar un contador. Devuelto por el rate limiter al consumidor.

| Campo       | Tipo      | Descripción                                                       |
|-------------|-----------|-------------------------------------------------------------------|
| `allowed`   | `boolean` | Si la request puede proceder                                      |
| `remaining` | `number`  | Requests restantes en la ventana actual                           |
| `limit`     | `number`  | Límite máximo aplicado                                            |
| `resetAt`   | `Date`    | Timestamp cuando la ventana se resetea (para header `Retry-After`) |

### SentryContext

Contexto enriquecido para inyectar en eventos de Sentry.

| Campo       | Tipo     | Descripción                                            |
|-------------|----------|--------------------------------------------------------|
| `tenantId`  | `string` | ID del tenant activo (puede ser undefined si no hay contexto) |
| `userId`    | `string` | ID del usuario (si hay sesión)                         |
| `role`      | `string` | Rol del usuario (ADMIN/OPERATOR/AGENT)                 |
| `endpoint`  | `string` | Ruta del endpoint o server action donde ocurrió el error|

---

## Claves Redis (almacén de rate limiting)

No son entidades de BD — son claves efímeras en Upstash Redis con TTL.

| Patrón de clave                              | TTL           | Descripción                                    |
|----------------------------------------------|---------------|------------------------------------------------|
| `rl:api:{api_key_id}:{window_start}`         | 2 × window    | Contador de requests por API key en ventana    |
| `rl:ip:login:{ip}:{window_start}`            | 2 × window    | Contador de intentos de login por IP           |
| `rl:ip:contact:{ip}:{window_start}`          | 2 × window    | Contador de envíos de contacto por IP          |
| `rl:lockout:login:{ip}`                      | lockoutMinutes| Bloqueo temporal tras exceder límite de login  |
| `rl:lockout:contact:{ip}`                    | lockoutMinutes| Bloqueo temporal tras exceder límite de contacto|

`window_start = floor(Date.now() / windowSizeMs) * windowSizeMs`

---

## Relaciones

- `RateLimitConfig` → se consume por el módulo `rate-limiter.ts`. No se persiste en BD.
- `RateLimitResult` → se devuelve al middleware/route handler que invoca el rate limiter.
- `SentryContext` → se extrae del `TenantContext` activo y se inyecta en Sentry vía `setTag`.
- `api_keys.rate_limit_per_min` → campo existente en BD que el rate limiter lee para determinar el límite por key.

---

## State Transitions

### Rate Limiter (por request)

```
Request llega
  → ¿Almacén disponible?
    → SÍ: leer contadores → calcular count → ¿excede límite?
      → SÍ: retornar { allowed: false, ... }
      → NO: incrementar contador → retornar { allowed: true, ... }
    → NO (error): log warn → retornar { allowed: true, ... } (degradación graceful)
```

### Error Boundary (por render)

```
Componente hijo lanza error en render
  → componentDidCatch captura el error
  → Reporta a Sentry con contexto de tenant
  → Setea state: hasError = true, error = capturedError
  → Renderiza fallback UI
  → Usuario pulsa "Reintentar" → reset state → reintenta render
```
