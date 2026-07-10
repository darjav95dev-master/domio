/**
 * Semantic application environment — INDEPENDENT of Node's `NODE_ENV`.
 *
 * `NODE_ENV` only distinguishes `development` (next dev) from `production`
 * (next build/start), so it cannot tell a deployed *development server* apart
 * from *production* — both run a production build. `APP_ENV` fills that gap.
 *
 * Values:
 * - `local`       → developer machine. Images served from `/public`
 *                   placeholders (R2 not required).
 * - `development` → deployed dev/staging server, backed by a real R2 bucket.
 * - `production`  → live site, backed by the production R2 bucket.
 *
 * Selected per environment via its `.env.<name>` file (see ENVIRONMENTS.md).
 * `NEXT_PUBLIC_APP_ENV` is read first so the value is also available in client
 * bundles; falls back to the server-only `APP_ENV`; defaults to `local`.
 */
export const APP_ENVS = ["local", "development", "production"] as const;

export type AppEnv = (typeof APP_ENVS)[number];

function resolveAppEnv(): AppEnv {
  const raw = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV;
  if (raw && (APP_ENVS as readonly string[]).includes(raw)) {
    return raw as AppEnv;
  }
  // Safe default: a machine with no APP_ENV set is a local dev machine.
  return "local";
}

export const APP_ENV: AppEnv = resolveAppEnv();

export const isLocal = APP_ENV === "local";
export const isDevelopmentServer = APP_ENV === "development";
export const isProduction = APP_ENV === "production";
