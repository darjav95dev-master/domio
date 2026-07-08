# Contracts: Rate Limiting & Observability

**Feature**: 008 | **Date**: 2026-07-08

---

## C-1: Rate Limiter Interface

```typescript
// src/infrastructure/rate-limiting/rate-limiter.types.ts

export interface RateLimitConfig {
  readonly limit: number;
  readonly windowMs: number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly limit: number;
  readonly resetAt: Date;
}

export interface RateLimiter {
  /**
   * Verifica si una request está permitida bajo el límite configurado.
   * Si el almacén no responde, retorna { allowed: true } (degradación graceful).
   */
  check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Incrementa el contador para el identificador dado.
   * Se llama solo si check() retornó allowed: true.
   * Retorna el resultado actualizado.
   */
  increment(identifier: string, config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Verifica e incrementa en una sola operación atómica.
   * Es el método principal que usan los consumidores.
   */
  consume(identifier: string, config: RateLimitConfig): Promise<RateLimitResult>;
}
```

### Contrato de degradación

- Si el almacén (Upstash Redis) lanza cualquier excepción, `consume()` retorna `{ allowed: true, remaining: Infinity, limit: config.limit, resetAt: now + config.windowMs }`.
- Se registra un log con nivel `warn` incluyendo: `scope`, `identifier`, `error.message`.
- El consumidor NUNCA necesita manejar errores del rate limiter — la interfaz siempre resuelve.

---

## C-2: Sentry Wrapper Interface

```typescript
// src/infrastructure/observability/sentry.wrapper.ts

export interface SentryContext {
  readonly tenantId?: string;
  readonly userId?: string;
  readonly role?: string;
  readonly endpoint?: string;
}

/**
 * Captura un error en Sentry con contexto enriquecido.
 * Inyecta tenant_id, user_id, role y endpoint como tags.
 * Si Sentry no está configurado (sin DSN), no-op silencioso.
 */
export function captureError(error: Error, context?: SentryContext): void;

/**
 * Establece el contexto de tenant para los siguientes eventos.
 * Se llama al resolver el TenantContext en middleware.
 */
export function setTenantContext(context: SentryContext): void;

/**
 * Añade un breadcrumb para el trail de debugging.
 * Los breadcrumbs se filtran para eliminar datos sensibles.
 */
export function addBreadcrumb(message: string, data?: Record<string, unknown>): void;
```

### Contrato de filtrado de secrets

- `beforeSend` elimina keys que matcheen: `/password|secret|token|api_?key|authorization|cookie|credit/i`
- El filtrado se aplica recursivamente sobre el payload del evento.
- `tenant_id` NO se filtra — es un identificador de negocio requerido.

---

## C-3: Error Boundary Props

```typescript
// src/shared/components/error-boundary.tsx

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}
```

### Contrato de comportamiento

- Si `fallback` no se provee, se usa el fallback por defecto: mensaje "Algo salió mal" + botón "Reintentar".
- Si `onError` se provee, se llama después de capturar el error (útil para reportar a Sentry).
- El botón "Reintentar" invoca `reset()` que pone `hasError = false` y reintenta el render de `children`.
- El fallback tiene `role="alert"` y `aria-live="polite"` para accesibilidad.

---

## C-4: HTTP Headers de Rate Limiting

Toda respuesta de `/api/v1/*` incluye:

| Header                  | Tipo     | Descripción                                    |
|-------------------------|----------|------------------------------------------------|
| `X-RateLimit-Limit`     | `number` | Límite máximo de la ventana                    |
| `X-RateLimit-Remaining` | `number` | Requests restantes en la ventana               |
| `X-RateLimit-Reset`     | `number` | Unix timestamp (seconds) cuando se resetea     |

Cuando se excede el límite:

| Status | Header         | Descripción                                    |
|--------|----------------|------------------------------------------------|
| `429`  | `Retry-After`  | Segundos hasta la próxima request permitida    |

Body del 429:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 12
}
```
