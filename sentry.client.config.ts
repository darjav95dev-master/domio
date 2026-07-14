import * as Sentry from "@sentry/nextjs";
import { createSentryConfig } from "@/infrastructure/observability/sentry-common";
import { markSentryInitialized } from "@/infrastructure/observability/sentry.wrapper";
import { isProduction } from "@/shared/config/app-env";

Sentry.init(
  createSentryConfig({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: isProduction ? 0.1 : 1.0,
  }),
);

markSentryInitialized();
