import { describe, it, expect, vi } from "vitest";
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
    const event = {
      extra: { password: "secret", normalField: "hello" },
    } as unknown as ErrorEvent;
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

  // El test anterior solo comprobaba toBeDefined(): pasaba en verde mientras el
  // environment salía de NODE_ENV, que vale "production" tanto en el servidor de
  // desarrollo como en el de producción (ambos corren un build de producción).
  // Los eventos de dev llegaban a Sentry etiquetados como production.
  it.each([
    ["development", "development"],
    ["production", "production"],
    ["local", "local"],
  ])("etiqueta environment=%s cuando APP_ENV=%s", async (appEnv, esperado) => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", appEnv);
    vi.stubEnv("NODE_ENV", "production"); // como en la imagen, en TODOS los entornos

    const { createSentryConfig: build } = await import("./sentry-common");
    const config = build({ dsn: TEST_DSN, tracesSampleRate: 1.0 });

    expect(config.environment).toBe(esperado);
    vi.unstubAllEnvs();
  });

  it("incluye la release del build", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SENTRY_RELEASE", "abc1234");

    const { createSentryConfig: build } = await import("./sentry-common");
    expect(build({ dsn: TEST_DSN, tracesSampleRate: 1.0 }).release).toBe("abc1234");

    vi.unstubAllEnvs();
  });
});
