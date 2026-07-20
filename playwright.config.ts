import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: {
      // Override autosave interval from 30s (production default, FR-012)
      // to 5s for faster E2E tests. The production 30s default is verified
      // in unit tests (use-autosave.spec.ts).
      E2E_AUTOSAVE_INTERVAL: "5000",
      // Claves de TEST públicas de Cloudflare Turnstile: el widget siempre
      // emite un token y el backend siempre lo valida como correcto. Permite
      // probar el envío del formulario de contacto en headless sin captcha real.
      // https://developers.cloudflare.com/turnstile/troubleshooting/testing/
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    },
  },
});
