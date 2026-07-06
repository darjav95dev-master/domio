#!/usr/bin/env node
/**
 * F003 visual validation — uses @playwright/test (already a devDependency).
 */
const { chromium } = require('@playwright/test');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const OUT = '.design-audit/f003-validation';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

async function main() {
  const browser = await chromium.launch();
  const results = { fonts: {}, tokens: {}, screenshots: [], issues: [] };

  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        colorScheme: 'light',
      });
      const page = await context.newPage();

      const resp = await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
      const httpOk = resp?.ok() ?? false;
      console.log(`[${vp.name}] HTTP ${resp?.status()}`);

      if (!httpOk) {
        results.issues.push(`${vp.name}: HTTP ${resp?.status()}`);
      }

      await page.waitForTimeout(1500);

      // Check fonts
      const fontCheck = await page.evaluate(() => {
        const checkFont = (family) => {
          try { return document.fonts.check(`16px ${family}`); } catch { return false; }
        };
        return {
          fraunces: checkFont('"Fraunces"') || checkFont('Fraunces'),
          inter: checkFont('"Inter"') || checkFont('Inter'),
          geistMono: checkFont('"Geist Mono"') || checkFont('Geist Mono'),
        };
      });
      results.fonts[vp.name] = fontCheck;
      console.log(`[${vp.name}] Fonts:`, JSON.stringify(fontCheck));

      // Check CSS tokens
      const tokenCheck = await page.evaluate(() => {
        const s = getComputedStyle(document.documentElement);
        const get = (p) => s.getPropertyValue(p).trim();
        const tokens = {
          '--color-ink': get('--color-ink'),
          '--color-bone': get('--color-bone'),
          '--color-paper': get('--color-paper'),
          '--color-terracota': get('--color-terracota'),
          '--color-slate': get('--color-slate'),
          '--bg-canvas': get('--bg-canvas'),
          '--bg-surface': get('--bg-surface'),
          '--fg-default': get('--fg-default'),
          '--fg-muted': get('--fg-muted'),
          '--fg-subtle': get('--fg-subtle'),
          '--fg-on-inverted': get('--fg-on-inverted'),
          '--accent-default': get('--accent-default'),
          '--accent-hover': get('--accent-hover'),
          '--border-default': get('--border-default'),
          '--focus-ring': get('--focus-ring'),
          '--font-display': get('--font-display'),
          '--font-body': get('--font-body'),
          '--font-mono': get('--font-mono'),
          '--radius-control': get('--radius-control'),
          '--radius-card': get('--radius-card'),
          '--radius-surface': get('--radius-surface'),
          '--radius-pill': get('--radius-pill'),
          '--space-4': get('--space-4'),
          '--space-gutter': get('--space-gutter'),
          '--space-section-lg': get('--space-section-lg'),
          '--duration-standard': get('--duration-standard'),
          '--ease-standard': get('--ease-standard'),
          '--z-nav': get('--z-nav'),
          '--z-modal': get('--z-modal'),
          '--shadow-tint': get('--shadow-tint'),
        };
        const filled = Object.entries(tokens).filter(([, v]) => v.length > 0).length;
        return { tokens, filled, total: Object.keys(tokens).length };
      });
      results.tokens[vp.name] = { filled: tokenCheck.filled, total: tokenCheck.total, sample: tokenCheck.tokens };
      console.log(`[${vp.name}] Tokens: ${tokenCheck.filled}/${tokenCheck.total} populated`);
      if (vp.name === 'desktop') {
        console.log(`[${vp.name}] Token values:`, JSON.stringify(tokenCheck.tokens, null, 2));
      }

      // Body computed styles
      const bodyStyles = await page.evaluate(() => {
        const b = getComputedStyle(document.body);
        return { backgroundColor: b.backgroundColor, color: b.color, fontFamily: b.fontFamily.substring(0, 120) };
      });
      console.log(`[${vp.name}] Body:`, JSON.stringify(bodyStyles));

      // Page content
      const pageContent = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelector('h1')?.textContent?.trim() ?? null,
        bodyText: document.body.innerText.trim().substring(0, 300),
        htmlClass: document.documentElement.className,
        colorScheme: document.documentElement.style.colorScheme,
      }));
      console.log(`[${vp.name}] Page:`, JSON.stringify(pageContent));

      // Screenshot
      const file = join(OUT, `home-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      results.screenshots.push({ viewport: vp.name, file });
      console.log(`[${vp.name}] Screenshot: ${file}`);

      await context.close();
    }
  } finally {
    await browser.close();
  }

  writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2));

  const allFontsOk = Object.values(results.fonts).every(f => f.fraunces && f.inter && f.geistMono);
  const allTokensOk = Object.values(results.tokens).every(t => t.filled >= 25);
  console.log(`\n========== F003 VALIDATION SUMMARY ==========`);
  console.log(`Page renders: ${results.issues.length === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`Fonts (Fraunces/Inter/Geist Mono): ${allFontsOk ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`CSS tokens in :root: ${allTokensOk ? 'PASS ✓' : 'FAIL ✗'}`);
  if (results.issues.length) console.log(`Issues: ${results.issues.join(', ')}`);
  console.log(`Screenshots: ${results.screenshots.map(s => s.file).join(', ')}`);
  console.log(`================================================`);
}

main().catch(e => { console.error(e); process.exit(1); });
