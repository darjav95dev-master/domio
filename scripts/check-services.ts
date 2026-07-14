#!/usr/bin/env tsx
/**
 * Verificación de servicios externos.
 *
 * Ejercita CADA servicio a través de los clientes reales de la app, para probar
 * que la integración conecta y funciona (no solo que la variable existe):
 *   - PostgreSQL   (conexión + consulta)
 *   - Cloudflare R2 (put/get/delete con r2Client + acceso público)
 *   - Resend        (envío real; requiere CHECK_EMAIL)
 *   - Upstash Redis (set/get + rate limiter NO no-op)
 *   - Sentry        (evento de prueba al DSN)
 *   - Turnstile     (siteverify: el secret es válido)
 *
 * Uso (dentro del contenedor worker, que tiene el entorno cargado):
 *   docker compose -p domio-prod --env-file deploy/env.prod -f deploy/docker-compose.app.yml \
 *     run --rm -e CHECK_EMAIL='tucorreo@ejemplo.com' worker tsx scripts/check-services.ts
 *
 * Sale con código 1 si algún servicio OBLIGATORIO falla.
 */
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

type Result = { ok: boolean; detail: string; skipped?: boolean };
const results: Record<string, Result> = {};
const record = (name: string, r: Result) => {
  results[name] = r;
  const icon = r.skipped ? "⏭️ " : r.ok ? "✅" : "❌";
  console.log(`${icon} ${name}: ${r.detail}`);
};

// ─────────────────────────── PostgreSQL ───────────────────────────
async function checkPostgres() {
  try {
    const { Client } = await import("pg");
    const c = new Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    const r = await c.query("select count(*)::int as n from promociones");
    await c.end();
    record("PostgreSQL", { ok: true, detail: `conectado · promociones=${r.rows[0].n}` });
  } catch (e) {
    record("PostgreSQL", { ok: false, detail: msg(e) });
  }
}

// ─────────────────────────── Cloudflare R2 ────────────────────────
async function checkR2() {
  try {
    const { r2Client } = await import("@/infrastructure/media/r2-client");
    const { mediaEnv } = await import("@/infrastructure/media/env");
    const key = `_healthcheck/${Date.now()}.txt`;
    const body = "domio-r2-healthcheck";

    await r2Client.send(
      new PutObjectCommand({ Bucket: mediaEnv.R2_BUCKET, Key: key, Body: body, ContentType: "text/plain" }),
    );
    const got = await r2Client.send(
      new GetObjectCommand({ Bucket: mediaEnv.R2_BUCKET, Key: key }),
    );
    const readBack = await got.Body?.transformToString();
    const roundtrip = readBack === body;

    // Acceso público por el CDN (depende de que el bucket tenga dominio público)
    let publicOk = false;
    try {
      const res = await fetch(`${mediaEnv.R2_PUBLIC_URL}/${key}`);
      publicOk = res.ok;
    } catch { /* red/no público */ }

    await r2Client.send(
      new DeleteObjectCommand({ Bucket: mediaEnv.R2_BUCKET, Key: key }),
    );

    record("Cloudflare R2", {
      ok: roundtrip,
      detail: `bucket=${mediaEnv.R2_BUCKET} · put/get/delete=${roundtrip ? "OK" : "KO"} · público(${mediaEnv.R2_PUBLIC_URL})=${publicOk ? "OK" : "no accesible ⚠️"}`,
    });
  } catch (e) {
    record("Cloudflare R2", { ok: false, detail: msg(e) });
  }
}

// ─────────────────────────── Resend ───────────────────────────────
async function checkResend() {
  const to = process.env.CHECK_EMAIL;
  if (!to) {
    record("Resend", { ok: true, skipped: true, detail: "sin CHECK_EMAIL → no se envía (pasa -e CHECK_EMAIL=...)" });
    return;
  }
  try {
    const { ResendClientImpl } = await import("@/infrastructure/email/resend.client");
    const client = new ResendClientImpl();
    const r = await client.send({
      to,
      subject: "Domio · healthcheck de servicios",
      html: "<p>Si recibes esto, Resend + dominio verificado funcionan.</p>",
      text: "Si recibes esto, Resend + dominio verificado funcionan.",
    });
    record("Resend", { ok: true, detail: `email enviado a ${to} · id=${r.id}` });
  } catch (e) {
    record("Resend", { ok: false, detail: msg(e) });
  }
}

// ─────────────────────────── Upstash / rate limit ─────────────────
async function checkUpstash() {
  try {
    const { getRedisClient } = await import("@/infrastructure/rate-limiting/redis-client");
    const { createRateLimiter } = await import("@/infrastructure/rate-limiting/rate-limiter.factory");
    const redis = getRedisClient();
    if (!redis) {
      record("Upstash (rate limit)", { ok: false, detail: "getRedisClient()=null → rate limiter en modo NO-OP (RATE_LIMIT_STORE_URL ausente)" });
      return;
    }
    const k = `_healthcheck:${Date.now()}`;
    await redis.set(k, "1", { ex: 30 });
    const v = await redis.get(k);
    await redis.del(k);
    const limiterName = createRateLimiter().constructor.name;
    const active = limiterName !== "NoopRateLimiter";
    record("Upstash (rate limit)", {
      ok: v === "1" && active,
      detail: `set/get=${v === "1" ? "OK" : "KO"} · limiter=${limiterName}${active ? "" : " ⚠️ NO-OP"}`,
    });
  } catch (e) {
    record("Upstash (rate limit)", { ok: false, detail: msg(e) });
  }
}

// ─────────────────────────── Sentry ───────────────────────────────
async function checkSentry() {
  try {
    if (!process.env.SENTRY_DSN) {
      record("Sentry", { ok: false, detail: "SENTRY_DSN ausente" });
      return;
    }
    const Sentry = await import("@sentry/nextjs");
    const { createSentryConfig } = await import("@/infrastructure/observability/sentry-common");
    Sentry.init(createSentryConfig({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 1.0 }));
    const id = Sentry.captureMessage(`Domio healthcheck · ${process.env.APP_ENV} · ${new Date().toISOString()}`, "info");
    await Sentry.flush(3000);
    record("Sentry", { ok: Boolean(id), detail: `evento enviado (id=${id}) → revísalo en el dashboard (${process.env.APP_ENV})` });
  } catch (e) {
    record("Sentry", { ok: false, detail: msg(e) });
  }
}

// ─────────────────────────── Turnstile ────────────────────────────
async function checkTurnstile() {
  try {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      record("Turnstile", { ok: false, detail: "TURNSTILE_SECRET_KEY ausente" });
      return;
    }
    const form = new URLSearchParams({ secret, response: "dummy-token" });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    const codes = data["error-codes"] ?? [];
    // Con un token falso esperamos success:false con "invalid-input-response".
    // Si el error fuese "invalid-input-secret", el secret estaría MAL.
    const secretValido = !codes.includes("invalid-input-secret");
    record("Turnstile", {
      ok: secretValido,
      detail: secretValido ? "secret válido (Cloudflare lo reconoce)" : "secret INVÁLIDO (invalid-input-secret)",
    });
  } catch (e) {
    record("Turnstile", { ok: false, detail: msg(e) });
  }
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function main() {
  console.log(`\n── Verificación de servicios externos · APP_ENV=${process.env.APP_ENV} ──\n`);
  await checkPostgres();
  await checkR2();
  await checkResend();
  await checkUpstash();
  await checkSentry();
  await checkTurnstile();

  const failed = Object.entries(results).filter(([, r]) => !r.ok && !r.skipped);
  console.log(`\n── Resultado: ${failed.length === 0 ? "TODO OK ✅" : `${failed.length} FALLO(S) ❌`} ──\n`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
