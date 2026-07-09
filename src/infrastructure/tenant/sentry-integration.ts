import { setTenantContext } from "@/infrastructure/observability/sentry.wrapper";
import type { TenantContext } from "./TenantContext";

/**
 * Sincroniza el contexto de tenant activo con Sentry, extrayendo
 * tenant_id, user_id y role del TenantContext proporcionado (o del
 * AsyncLocalStorage almacenado en la request).
 *
 * Puede invocarse manualmente tras resolver el contexto si se desea
 * que los errores posteriores lleven los tags de tenant en Sentry.
 *
 * @param ctx — TenantContext opcional. Si se omite, se intenta leer
 *   del almacenamiento de ámbito de request (AsyncLocalStorage).
 */
export function syncSentryWithTenant(ctx?: TenantContext): void {
  if (!ctx) return;

  const context: { tenantId: string; userId?: string; role?: string } = {
    tenantId: ctx.getTenantId(),
  };

  if ("userId" in ctx && typeof (ctx as Record<string, unknown>).userId === "string") {
    const authed = ctx as unknown as { userId: string; role: string };
    context.userId = authed.userId;
    context.role = authed.role;
  }

  setTenantContext(context);
}
