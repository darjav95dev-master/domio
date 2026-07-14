import * as Sentry from "@sentry/nextjs";
import { createSentryConfig } from "@/infrastructure/observability/sentry-common";
import { markSentryInitialized } from "@/infrastructure/observability/sentry.wrapper";
import { isProduction } from "@/shared/config/app-env";

/**
 * Sentry en el NAVEGADOR.
 *
 * Antes esto vivía en `sentry.client.config.ts`, que Next NO carga por sí solo:
 * ese fichero solo se inyecta en el bundle si `next.config` va envuelto en
 * `withSentryConfig`, y no lo estaba. Resultado: el SDK del cliente nunca
 * arrancaba y ningún error de navegador llegó jamás a Sentry, aunque el fichero
 * pareciera perfectamente correcto.
 *
 * `instrumentation-client.ts` sí lo carga Next de forma nativa (15.3+), igual
 * que `instrumentation.ts` para el servidor. Sin plugins ni build extra.
 */
Sentry.init(
  createSentryConfig({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: isProduction ? 0.1 : 1.0,
  }),
);

markSentryInitialized();

// Instrumenta las navegaciones del App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
