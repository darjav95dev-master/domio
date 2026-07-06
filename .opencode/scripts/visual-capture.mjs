#!/usr/bin/env node
/**
 * visual-capture.mjs — the "eye" of the design pipeline.
 *
 * Renders the running app and captures full-page screenshots of the given
 * routes at desktop + mobile widths, so the design-critic can score the REAL
 * output against the excellence rubric (not the design.md on paper).
 *
 * Uses the project's own Playwright (already a devDependency). No MCP, no
 * external service, no new install (chromium is already in the Playwright cache).
 *
 * Usage:
 *   node .opencode/scripts/visual-capture.mjs \
 *     --base-url http://localhost:3000 \
 *     --routes / /catalog /books/cien-anos-de-soledad \
 *     --out .design-audit
 *
 * Assumes the dev server is already running at --base-url. The caller (the
 * design-critic agent or the orchestrator) is responsible for `pnpm dev`.
 *
 * Output: <out>/<timestamp>/<slug>-<viewport>.png  + a manifest.json listing them.
 * Prints the manifest path on stdout so the critic can read the shots.
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function parseArgs(argv) {
  const args = { baseUrl: 'http://localhost:3000', routes: [], out: '.design-audit' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--base-url') args.baseUrl = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--routes') {
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) args.routes.push(argv[++i]);
    }
  }
  if (args.routes.length === 0) args.routes = ['/', '/catalog'];
  return args;
}

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

function slugify(route) {
  const s = route.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9]+/g, '-');
  return s.length ? s : 'home';
}

/**
 * Scroll the whole page in steps so scroll-driven reveals (IntersectionObserver
 * opacity 0→1, staggered entrances) actually fire before we capture. Without
 * this, any reveal-on-scroll content screenshots as blank and the critic
 * misjudges the page as empty. Then return to top for a clean full-page shot.
 */
async function triggerReveals(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    const height = document.body.scrollHeight;
    for (let y = 0; y <= height; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  });
}

async function main() {
  const { baseUrl, routes, out } = parseArgs(process.argv);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join(out, stamp);
  mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch();
  const shots = [];

  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        colorScheme: 'light',
      });
      const page = await context.newPage();
      for (const route of routes) {
        const url = new URL(route, baseUrl).toString();
        let ok = true;
        let error = null;
        try {
          const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          ok = Boolean(resp && resp.ok());
          if (!ok) error = `HTTP ${resp ? resp.status() : 'no-response'}`;
          // let fonts settle, then scroll to fire reveal-on-scroll content
          await page.waitForTimeout(500);
          await triggerReveals(page);
        } catch (e) {
          ok = false;
          error = String(e.message ?? e);
        }
        const file = join(dir, `${slugify(route)}-${vp.name}.png`);
        try {
          await page.screenshot({ path: file, fullPage: true });
        } catch (e) {
          error = (error ? error + '; ' : '') + `screenshot failed: ${e.message}`;
        }
        shots.push({ route, viewport: vp.name, url, file, ok, error });
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const manifestPath = join(dir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify({ baseUrl, capturedAt: stamp, shots }, null, 2));

  const failures = shots.filter((s) => !s.ok);
  console.log(manifestPath);
  if (failures.length) {
    console.error(`\n${failures.length} route(s) failed to render cleanly:`);
    for (const f of failures) console.error(`  ${f.route} [${f.viewport}] → ${f.error}`);
    process.exitCode = 2; // signal: the app did not render real content
  }
}

main().catch((e) => {
  console.error('visual-capture failed:', e);
  process.exit(1);
});
