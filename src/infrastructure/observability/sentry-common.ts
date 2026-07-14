import type { ErrorEvent, Breadcrumb } from "@sentry/nextjs";
import { sanitizeEvent } from "./sentry.wrapper";
import { APP_ENV } from "@/shared/config/app-env";

export interface SentryConfigOptions {
  readonly dsn: string | undefined;
  readonly tracesSampleRate: number;
}

export interface SentryConfig {
  dsn: string | undefined;
  tracesSampleRate: number;
  environment: string;
  release: string | undefined;
  beforeSend(event: ErrorEvent, hint: unknown): ErrorEvent;
  beforeBreadcrumb(breadcrumb: Breadcrumb, hint: unknown): Breadcrumb;
}

/**
 * Creates a shared Sentry config object, deduplicating the logic
 * that was previously verbatim-copied between instrumentation-client.ts
 * and sentry.server.config.ts.
 *
 * @param options - Configuration options (DSN and sample rate).
 */
export function createSentryConfig(options: SentryConfigOptions): SentryConfig {
  return {
    dsn: options.dsn,
    tracesSampleRate: options.tracesSampleRate,

    // NODE_ENV vale "production" en dev Y en prod (ambos corren un build de
    // producción en la imagen), así que no distingue los entornos: los eventos
    // de dev llegaban a Sentry etiquetados como production. APP_ENV sí distingue
    // — es para lo que existe (ver shared/config/app-env.ts). VERCEL_ENV nunca
    // está: el despliegue es Docker, no Vercel.
    environment: APP_ENV,

    // Se incrusta en build (Makefile / cd.yml lo pasan como build-arg con el
    // sha del commit). Permite atribuir un error a una versión concreta.
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    beforeSend(event: ErrorEvent): ErrorEvent {
      return sanitizeEvent(
        event as unknown as Record<string, unknown>,
      ) as unknown as ErrorEvent;
    },

    beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
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
  };
}
