import type { ErrorEvent, Breadcrumb } from "@sentry/nextjs";
import { sanitizeEvent } from "./sentry.wrapper";

export interface SentryConfigOptions {
  readonly dsn: string | undefined;
  readonly tracesSampleRate: number;
}

export interface SentryConfig {
  dsn: string | undefined;
  tracesSampleRate: number;
  environment: string;
  beforeSend(event: ErrorEvent, hint: unknown): ErrorEvent;
  beforeBreadcrumb(breadcrumb: Breadcrumb, hint: unknown): Breadcrumb;
}

/**
 * Creates a shared Sentry config object, deduplicating the logic
 * that was previously verbatim-copied between sentry.client.config.ts
 * and sentry.server.config.ts.
 *
 * @param options - Configuration options (DSN and sample rate).
 */
export function createSentryConfig(options: SentryConfigOptions): SentryConfig {
  return {
    dsn: options.dsn,
    tracesSampleRate: options.tracesSampleRate,

    environment:
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV ??
      "development",

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
