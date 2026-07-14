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
 *     run --rm -e CHECK_EMAIL='tucorreo@ejemplo.com' worker pnpm check:services
 *
 * Vía pnpm, no `tsx` a secas: el binario no está en el PATH del contenedor y el
 * entrypoint de la imagen de Node acaba pasándoselo a `node` como si fuera un
 * fichero ("Cannot find module '/app/tsx'").
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
    const esperado = `domio-${Date.now()}`;

    await redis.set(k, esperado, { ex: 30 });
    const v = await redis.get(k);
    await redis.del(k);

    // El SDK de Upstash deserializa el valor al leerlo, así que no se compara con
    // === contra una cadena: se normaliza. Antes se guardaba "1" y se comparaba
    // con === "1"; si volvía el número 1, el check decía KO con Redis funcionando.
    const roundtrip = String(v) === esperado;

    const limiterName = createRateLimiter().constructor.name;
    const active = limiterName !== "NoopRateLimiter";

    record("Upstash (rate limit)", {
      ok: roundtrip && active,
      detail: roundtrip
        ? `set/get=OK · limiter=${limiterName}${active ? "" : " ⚠️ NO-OP (permite todo)"}`
        : `set/get=KO · escribí "${esperado}" y leí ${JSON.stringify(v)} (tipo ${typeof v}) · limiter=${limiterName}`,
    });
  } catch (e) {
    record("Upstash (rate limit)", { ok: false, detail: msg(e) });
  }
}

// ─────────────────────────── Sentry ───────────────────────────────
// Se envía el evento al endpoint de ingesta con fetch, no con el SDK:
// @sentry/nextjs no expone captureMessage fuera del runtime de Next
// ("Sentry.captureMessage is not a function"). Además así se prueba lo que
// importa de verdad — que el DSN es válido y que hay salida de red al proyecto.
async function checkSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    record("Sentry", { ok: false, detail: "SENTRY_DSN ausente" });
    return;
  }

  try {
    // https://<clave>@<host>/<projectId>
    const { username: key, host, pathname } = new URL(dsn);
    const projectId = pathname.replace(/^\//, "");

    const res = await fetch(`https://${host}/api/${projectId}/store/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=domio-healthcheck/1.0`,
      },
      body: JSON.stringify({
        message: `Domio healthcheck · ${process.env.APP_ENV} · ${new Date().toISOString()}`,
        level: "info",
        platform: "node",
        environment: process.env.APP_ENV,
      }),
    });

    const body = (await res.json()) as { id?: string };
    record("Sentry", {
      ok: res.ok && Boolean(body.id),
      detail: res.ok
        ? `evento aceptado (id=${body.id}) → revísalo en el dashboard (${process.env.APP_ENV})`
        : `Sentry rechazó el evento (HTTP ${res.status})`,
    });
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
