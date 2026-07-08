import { describe, it, expect } from "vitest";
import { createSentryConfig } from "./sentry-common";
import type { ErrorEvent, Breadcrumb } from "@sentry/nextjs";

describe("createSentryConfig", () => {
  const TEST_DSN = "https://key@o0.ingest.sentry.io/project";

  it("returns config with the given DSN", () => {
    const config = createSentryConfig({ dsn: TEST_DSN, tracesSampleRate: 0.1 });
    expect(config.dsn).toBe(TEST_DSN);
  });

  it("preserves tracesSampleRate", () => {
    const config = createSentryConfig({ dsn: TEST_DSN, tracesSampleRate: 0.5 });
    expect(config.tracesSampleRate).toBe(0.5);
  });

  it("provides beforeSend that scrubs sensitive data", () => {
    const config = createSentryConfig({ dsn: TEST_DSN, tracesSampleRate: 0.1 });
    expect(config.beforeSend).toBeDefined();

    // test data for scrubber verification
    /* eslint-disable sonarjs/no-hardcoded-passwords */
    const event = {
      extra: { password: "secret", normalField: "hello" },
    } as unknown as ErrorEvent;
    /* eslint-enable sonarjs/no-hardcoded-passwords */
    const result = config.beforeSend(event, {} as ErrorEvent);
    expect((result as unknown as Record<string, unknown>).extra).toBeDefined();
    const extra = (result as unknown as { extra: Record<string, unknown> }).extra;
    expect(extra.password).toBe("[FILTERED]");
    expect(extra.normalField).toBe("hello");
  });

  it("provides beforeBreadcrumb that scrubs sensitive data", () => {
    const config = createSentryConfig({ dsn: TEST_DSN, tracesSampleRate: 0.1 });
    expect(config.beforeBreadcrumb).toBeDefined();

    const breadcrumb: Breadcrumb = { message: "test", data: { api_key: "sk-123", url: "/ok" } };
    const result = config.beforeBreadcrumb(breadcrumb, {} as Breadcrumb);
    expect(result.data).toBeDefined();
    expect((result.data as Record<string, unknown>).api_key).toBe("[FILTERED]");
    expect((result.data as Record<string, unknown>).url).toBe("/ok");
  });

  it("includes environment from NODE_ENV", () => {
    const config = createSentryConfig({ dsn: TEST_DSN, tracesSampleRate: 1.0 });
    expect(config.environment).toBeDefined();
  });
});
