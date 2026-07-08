import { setTenantContext } from "@/infrastructure/observability/sentry.wrapper";
import { getTenantContext } from "./context-middleware";

/**
 * Sincroniza el contexto de tenant activo con Sentry.
 *
 * Extrae el TenantContext del AsyncLocalStorage actual y llama a
 * `setTenantContext()` para que los errores posteriores lleven los tags
 * de tenant_id, user_id y role.
 *
 * Se invoca tras resolver el TenantContext (en middleware, server action
 * o layout) antes de ejecutar lógica de negocio.
 */
export function syncSentryWithTenant(): void {
  const ctx = getTenantContext();

  if (!ctx) return;

  const ctxAny = ctx as { userId?: string | null; role?: string | null };

  setTenantContext({
    tenantId: ctx.getTenantId(),
    ...(ctxAny.userId ? { userId: ctxAny.userId } : {}),
    ...(ctxAny.role ? { role: ctxAny.role } : {}),
  });
}
