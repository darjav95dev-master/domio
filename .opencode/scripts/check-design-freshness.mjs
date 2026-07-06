#!/usr/bin/env node
/**
 * check-design-freshness.mjs — nag when dated design content expires.
 *
 * Fixes the "dead-letter date" problem (critiques #2 owner/cadence, #3 linkrot):
 * a `Next review` or `Last verified` line means nothing without something that
 * checks it. This reads those dates from the motor and WARNS when past due.
 *
 *   - ai-default-traps.md   `Next review: YYYY-MM[-DD]`  → warn if today is past it.
 *   - reference-library.md  `Last verified: YYYY-MM-DD`  → warn if older than 90 days.
 *
 * ADVISORY by design: prints warnings and ALWAYS exits 0 (never blocks a commit).
 * Silent when everything is fresh. Zero dependencies.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const kit = join(homedir(), '.claude', 'skills', 'visual-design-kit', 'references');
const trapsPath = join(kit, 'ai-default-traps.md');
const refsPath = join(kit, 'reference-library.md');

const warnings = [];
const today = new Date();

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

// --- traps: Next review (YYYY-MM or YYYY-MM-DD) -------------------------------
const traps = read(trapsPath);
if (traps) {
  const m = /Next review:\s*(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(traps);
  if (m) {
    const [, y, mo, d] = m;
    // end of the review month if no day given → grace until month end
    const due = d
      ? new Date(Number(y), Number(mo) - 1, Number(d))
      : new Date(Number(y), Number(mo), 0); // day 0 of next month = last day of this
    if (today > due) {
      const overdue = Math.floor((today - due) / 86400000);
      warnings.push(`ai-default-traps.md: revisión vencida hace ${overdue} día(s) (Next review: ${m[0].split(':')[1].trim()}). El default AI muta; revisa la lista.`);
    }
  } else {
    warnings.push(`ai-default-traps.md: no encuentro "Next review:" — añade una fecha de revisión.`);
  }
}

// --- reference-library: Last verified (older than 90 days) -------------------
const refs = read(refsPath);
if (refs) {
  const m = /Last verified:\s*(\d{4})-(\d{2})-(\d{2})/.exec(refs);
  if (m) {
    const verified = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const age = Math.floor((today - verified) / 86400000);
    if (age > 90) {
      warnings.push(`reference-library.md: verificado hace ${age} días (>90). Re-verifica URLs (linkrot) y tipografías/paletas "actuales".`);
    }
  } else {
    warnings.push(`reference-library.md: no encuentro "Last verified:" — añade una fecha.`);
  }
}

// --- report (advisory, never blocks) -----------------------------------------
if (warnings.length > 0) {
  console.warn('⚠ Frescura del motor de diseño:');
  for (const w of warnings) console.warn(`  - ${w}`);
}
process.exit(0);
