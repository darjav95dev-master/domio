import * as Sentry from "@sentry/nextjs";
import { createSentryConfig } from "@/infrastructure/observability/sentry-common";
import { markSentryInitialized } from "@/infrastructure/observability/sentry.wrapper";

Sentry.init(
  createSentryConfig({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  }),
);

markSentryInitialized();
