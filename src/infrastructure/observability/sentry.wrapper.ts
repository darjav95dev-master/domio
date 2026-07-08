import * as Sentry from "@sentry/nextjs";

export interface SentryContext {
  readonly tenantId?: string;
  readonly userId?: string;
  readonly role?: string;
  readonly endpoint?: string;
}

const SECRET_PATTERN = /password|secret|token|api_?key|authorization|cookie|credit/i;

function isSentryConfigured(): boolean {
  return !!(
    process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  );
}

function applyContext(context: SentryContext): void {
  if (context.tenantId) Sentry.setTag("tenant_id", context.tenantId);
  if (context.userId) Sentry.setTag("user_id", context.userId);
  if (context.role) Sentry.setTag("role", context.role);
  if (context.endpoint) Sentry.setTag("endpoint", context.endpoint);
}

/**
 * Captura un error en Sentry con contexto enriquecido.
 * Inyecta tenant_id, user_id, role y endpoint como tags.
 * Si Sentry no está configurado (sin DSN), no-op silencioso.
 */
export function captureError(error: Error, context?: SentryContext): void {
  if (!isSentryConfigured()) return;

  if (context) {
    applyContext(context);
  }

  Sentry.captureException(error);
}

/**
 * Establece el contexto de tenant para los siguientes eventos.
 * Se llama al resolver el TenantContext en middleware.
 */
export function setTenantContext(context: SentryContext): void {
  if (!isSentryConfigured()) return;

  applyContext(context);
}

/**
 * Añade un breadcrumb para el trail de debugging.
 * Los breadcrumbs se filtran para eliminar datos sensibles.
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!isSentryConfigured()) return;

  Sentry.addBreadcrumb({ message, data });
}

// ─── Filtrado de secrets ─────────────────────────────────────────────────────

function deepScrub(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(deepScrub);
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (SECRET_PATTERN.test(key)) {
        result[key] = "[FILTERED]";
      } else {
        result[key] = deepScrub(val);
      }
    }

    return result;
  }

  return value;
}

/**
 * Filtra datos sensibles de un evento de Sentry.
 * Sustituye valores de keys que matcheen el patrón por '[FILTERED]'.
 * Se aplica recursivamente sobre el payload completo del evento.
 */
export function sanitizeEvent(
  event: Record<string, unknown>,
): Record<string, unknown> {
  const scrubbed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(event)) {
    scrubbed[key] = deepScrub(value);
  }

  return scrubbed;
}
