import * as Sentry from "@sentry/nextjs";
import { createSentryConfig } from "@/infrastructure/observability/sentry-common";
import { markSentryInitialized } from "@/infrastructure/observability/sentry.wrapper";
import { isProduction } from "@/shared/config/app-env";

Sentry.init(
  createSentryConfig({
    dsn: process.env.SENTRY_DSN,
    // NODE_ENV es "production" también en el servidor de desarrollo (corre un
    // build de producción), así que muestreaba al 10% donde queremos el 100%.
    tracesSampleRate: isProduction ? 0.1 : 1.0,
  }),
);

markSentryInitialized();
