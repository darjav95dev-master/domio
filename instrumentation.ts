export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Fail-fast: en producción, sin RATE_LIMIT_STORE_URL el rate limiter cae a
    // NoopRateLimiter (permite cualquier petición) → fuerza bruta y límites de API desactivados
    // en silencio. Convertimos ese fallo silencioso en un fallo ruidoso de arranque.
    if (
      process.env.APP_ENV === "production" &&
      !process.env.RATE_LIMIT_STORE_URL
    ) {
      throw new Error(
        "RATE_LIMIT_STORE_URL is required when APP_ENV=production (rate limiting would be silently disabled).",
      );
    }

    // Inicializar Sentry server-side (importa sentry.server.config.ts que
    // ejecuta Sentry.init con DSN, tracesSampleRate y beforeSend).
    await import("./sentry.server.config");
  }
}
