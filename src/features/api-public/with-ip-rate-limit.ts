import { createRateLimiter } from "@/infrastructure/rate-limiting/rate-limiter.factory";
import type {
  RateLimitConfig,
  RateLimitResult,
} from "@/infrastructure/rate-limiting/rate-limiter.types";
import { PUBLIC_API_IP_MAX_PER_MIN } from "@/shared/constants/rate-limits";
import { extractIpFromHeaders } from "@/shared/utils/extract-ip";

const WINDOW_MS = 60_000; // ventana deslizante de 1 minuto

/**
 * Guarda anti-abuso por IP para la API pública v1, previo a la autenticación
 * por clave. Consume un token de una ventana deslizante keyed por IP.
 *
 * A diferencia de `checkIpRateLimit` (login/contact), NO aplica lockout: un
 * pico puntual solo devuelve 429 durante el resto de la ventana y se recupera
 * en la siguiente. Degrada de forma graceful: si el store no está configurado
 * o no responde, el limiter devuelve `allowed: true` y la request pasa.
 *
 * @param request - La request entrante (para leer la IP de las cabeceras).
 * @returns `allowed` y el `result` para adjuntar cabeceras X-RateLimit-*.
 */
export async function applyPublicApiIpRateLimit(
  request: Request,
): Promise<{ allowed: boolean; result: RateLimitResult }> {
  const ip = extractIpFromHeaders(request.headers);
  const config: RateLimitConfig = {
    limit: PUBLIC_API_IP_MAX_PER_MIN,
    windowMs: WINDOW_MS,
  };
  const result = await createRateLimiter().consume(`ip:public-api:${ip}`, config);
  return { allowed: result.allowed, result };
}
