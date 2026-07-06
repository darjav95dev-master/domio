#!/usr/bin/env node
/**
 * F003 visual validation — uses @playwright/test (already a devDependency).
 * Checks: page renders, fonts load, CSS tokens exist in :root, screenshots.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

      // Navigate
      const resp = await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
      const httpOk = resp?.ok() ?? false;
      console.log(`[${vp.name}] HTTP ${resp?.status()}`);

      if (!httpOk) {
        results.issues.push(`${vp.name}: HTTP ${resp?.status()}`);
      }

      // Wait for fonts
      await page.waitForTimeout(1000);

      // Check fonts loaded
      const fontCheck = await page.evaluate(() => {
        const checkFont = (family) => document.fonts.check(`16px ${family}`);
        return {
          fraunces: checkFont('"Fraunces"') || checkFont('Fraunces'),
          inter: checkFont('"Inter"') || checkFont('Inter'),
          geistMono: checkFont('"Geist Mono"') || checkFont('Geist Mono'),
        };
      });
      results.fonts[vp.name] = fontCheck;
      console.log(`[${vp.name}] Fonts:`, JSON.stringify(fontCheck));

      // Check CSS custom properties on :root
      const tokenCheck = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        const tokens = {
          // Primitive colors
          '--color-ink': style.getPropertyValue('--color-ink').trim(),
          '--color-bone': style.getPropertyValue('--color-bone').trim(),
          '--color-paper': style.getPropertyValue('--color-paper').trim(),
          '--color-terracota': style.getPropertyValue('--color-terracota').trim(),
          '--color-slate': style.getPropertyValue('--color-slate').trim(),
          // Semantic colors
          '--bg-canvas': style.getPropertyValue('--bg-canvas').trim(),
          '--bg-surface': style.getPropertyValue('--bg-surface').trim(),
          '--fg-default': style.getPropertyValue('--fg-default').trim(),
          '--fg-muted': style.getPropertyValue('--fg-muted').trim(),
          '--fg-subtle': style.getPropertyValue('--fg-subtle').trim(),
          '--fg-on-inverted': style.getPropertyValue('--fg-on-inverted').trim(),
          '--accent-default': style.getPropertyValue('--accent-default').trim(),
          '--accent-hover': style.getPropertyValue('--accent-hover').trim(),
          '--border-default': style.getPropertyValue('--border-default').trim(),
          '--focus-ring': style.getPropertyValue('--focus-ring').trim(),
          // Typography
          '--font-display': style.getPropertyValue('--font-display').trim(),
          '--font-body': style.getPropertyValue('--font-body').trim(),
          '--font-mono': style.getPropertyValue('--font-mono').trim(),
          // Radius
          '--radius-control': style.getPropertyValue('--radius-control').trim(),
          '--radius-card': style.getPropertyValue('--radius-card').trim(),
          '--radius-surface': style.getPropertyValue('--radius-surface').trim(),
          '--radius-pill': style.getPropertyValue('--radius-pill').trim(),
          // Spacing
          '--space-4': style.getPropertyValue('--space-4').trim(),
          '--space-gutter': style.getPropertyValue('--space-gutter').trim(),
          '--space-section-lg': style.getPropertyValue('--space-section-lg').trim(),
          // Motion
          '--duration-standard': style.getPropertyValue('--duration-standard').trim(),
          '--ease-standard': style.getPropertyValue('--ease-standard').trim(),
          // Z-index
          '--z-nav': style.getPropertyValue('--z-nav').trim(),
          '--z-modal': style.getPropertyValue('--z-modal').trim(),
          // Shadow tint
          '--shadow-tint': style.getPropertyValue('--shadow-tint').trim(),
        };
        // Count non-empty
        const filled = Object.entries(tokens).filter(([, v]) => v.length > 0).length;
        return { tokens, filled, total: Object.keys(tokens).length };
      });
      results.tokens[vp.name] = { filled: tokenCheck.filled, total: tokenCheck.total };
      console.log(`[${vp.name}] Tokens: ${tokenCheck.filled}/${tokenCheck.total} populated`);
      if (vp.name === 'desktop') {
        // Log actual values for verification
        console.log(`[${vp.name}] Token values:`, JSON.stringify(tokenCheck.tokens, null, 2));
      }

      // Check body background and color
      const bodyStyles = await page.evaluate(() => {
        const body = getComputedStyle(document.body);
        return {
          backgroundColor: body.backgroundColor,
          color: body.color,
          fontFamily: body.fontFamily,
        };
      });
      console.log(`[${vp.name}] Body:`, JSON.stringify(bodyStyles));

      // Check page content
      const pageContent = await page.evaluate(() => {
        return {
          title: document.title,
          h1: document.querySelector('h1')?.textContent?.trim() ?? null,
          bodyText: document.body.innerText.trim().substring(0, 200),
          htmlElement: document.documentElement.className,
          hasColorScheme: document.documentElement.style.colorScheme,
        };
      });
      console.log(`[${vp.name}] Page:`, JSON.stringify(pageContent));

      // Screenshot
      const file = join(OUT, `home-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      results.screenshots.push({ viewport: vp.name, file });
      console.log(`[${vp.name}] Screenshot saved: ${file}`);

      await context.close();
    }
  } finally {
    await browser.close();
  }

  // Write results
  const resultsPath = join(OUT, 'results.json');
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults written to ${resultsPath}`);

  // Summary
  const allFontsOk = Object.values(results.fonts).every(f => f.fraunces && f.inter && f.geistMono);
  const allTokensOk = Object.values(results.tokens).every(t => t.filled >= 25);
  console.log(`\n=== SUMMARY ===`);
  console.log(`Fonts loaded: ${allFontsOk ? 'PASS' : 'FAIL'}`);
  console.log(`CSS tokens: ${allTokensOk ? 'PASS' : 'FAIL'}`);
  console.log(`Issues: ${results.issues.length === 0 ? 'NONE' : results.issues.join(', ')}`);
}

main().catch(e => { console.error(e); process.exit(1); });
