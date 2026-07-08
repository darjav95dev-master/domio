import * as Sentry from "@sentry/nextjs";
import { sanitizeEvent } from "@/infrastructure/observability/sentry.wrapper";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Muestreo: 0.1 en producción, 1.0 en desarrollo / preview
  tracesSampleRate:
    process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",

  // Filtra datos sensibles antes de enviar el evento a Sentry
  beforeSend(event) {
    return sanitizeEvent(
      event as unknown as Record<string, unknown>,
    ) as unknown as Sentry.ErrorEvent;
  },

  // Filtra datos sensibles en breadcrumbs antes de registrarlos
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.data) {
      const scrubbed = sanitizeEvent({
        data: breadcrumb.data,
      } as unknown as Record<string, unknown>);
      breadcrumb.data = (
        scrubbed as { data?: Record<string, unknown> }
      ).data;
    }
    return breadcrumb;
  },
});
