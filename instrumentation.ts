export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Inicializar Sentry server-side (importa sentry.server.config.ts que
    // ejecuta Sentry.init con DSN, tracesSampleRate y beforeSend).
    await import("./sentry.server.config");
  }
}
