import { getRedisClient } from "@/infrastructure/rate-limiting/redis-client";
import { logger } from "@/shared/utils/logger";
import { pingDatabase } from "@/infrastructure/db/repositories/health.repository";

export const dynamic = "force-dynamic";

type DependencyStatus = "ok" | "down" | "not_configured";

/**
 * Liveness rápido: `SELECT 1`. La DB es una dependencia requerida.
 */
async function checkDatabase(): Promise<DependencyStatus> {
  try {
    await pingDatabase();
    return "ok";
  } catch (error) {
    logger.error(
      "health: database check failed:",
      error instanceof Error ? error.message : String(error),
    );
    return "down";
  }
}

/**
 * Redis es opcional (rate-limiting): si no está configurado no es un fallo,
 * solo se reporta como `not_configured`.
 */
async function checkRedis(): Promise<DependencyStatus> {
  const redis = getRedisClient();
  if (!redis) return "not_configured";
  try {
    await redis.ping();
    return "ok";
  } catch (error) {
    logger.warn(
      "health: redis check failed:",
      error instanceof Error ? error.message : String(error),
    );
    return "down";
  }
}

/**
 * GET /api/health
 *
 * Por defecto es un liveness barato: `{ status: "ok", env }`. El pipeline de CD
 * lee `env` para verificar que el servidor arrancó con la config correcta.
 *
 * Con `?deep=1` hace un readiness real: comprueba DB (requerida) y Redis
 * (opcional). Devuelve 503 si una dependencia requerida está caída, para que
 * un balanceador o el CD puedan detectar el estado degradado.
 */
export async function GET(request?: Request): Promise<Response> {
  const env = process.env.APP_ENV ?? "unknown";

  // request es opcional para permitir llamarlo como liveness simple (p. ej.
  // desde un smoke test o un probe sin URL). Sin ?deep=1 → liveness barato.
  const deep = request ? new URL(request.url).searchParams.get("deep") : null;
  if (deep !== "1" && deep !== "true") {
    return Response.json({ status: "ok", env }, { status: 200 });
  }

  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);

  // Redis "not_configured" no degrada; solo "down" (configurado pero caído).
  const healthy = database === "ok" && redis !== "down";

  return Response.json(
    { status: healthy ? "ok" : "degraded", env, checks: { database, redis } },
    { status: healthy ? 200 : 503 },
  );
}
