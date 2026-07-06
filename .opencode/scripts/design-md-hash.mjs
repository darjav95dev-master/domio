#!/usr/bin/env node
/**
 * design-md-hash.mjs — guard against silent design.md drift (critique #7).
 *
 * design.md is mutable but untracked: editing it in feature 007 silently
 * invalidates the visual baseline of features 001–006 (never re-rendered nor
 * re-scored). This records, per feature, the hash of design.md that the
 * design-critic validated against, and warns when the current design.md differs
 * from what an earlier feature was validated against.
 *
 * Usage:
 *   node .opencode/scripts/design-md-hash.mjs --check
 *       → prints features whose recorded hash ≠ current design.md hash (stale).
 *         exit 3 if any stale, 0 otherwise.
 *   node .opencode/scripts/design-md-hash.mjs --verify <feature>
 *       → HARD gate for re-runs: if <feature> was already validated against a
 *         DIFFERENT design.md hash, exit 4 (no excuse — the baseline drifted
 *         under a signed-off feature). New/consistent feature → exit 0.
 *   node .opencode/scripts/design-md-hash.mjs --record <feature> <verdict>
 *       → appends {feature, hash, verdict, date} to the validation log.
 *
 * Log: .design-audit/validation-log.json (gitignored with .design-audit/).
 * Zero dependencies.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESIGN_CANDIDATES = [
  join(repoRoot, '.specify', 'memory', 'design.md'),
  join(repoRoot, 'design.md'),
];
const LOG = join(repoRoot, '.design-audit', 'validation-log.json');

function designMdPath() {
  const p = DESIGN_CANDIDATES.find(existsSync);
  if (!p) {
    console.error('No encuentro design.md (.specify/memory/design.md ni design.md en la raíz).');
    process.exit(1);
  }
  return p;
}

function currentHash() {
  return createHash('sha256').update(readFileSync(designMdPath())).digest('hex').slice(0, 12);
}

function readLog() {
  if (!existsSync(LOG)) return [];
  try {
    return JSON.parse(readFileSync(LOG, 'utf8'));
  } catch {
    return [];
  }
}

function writeLog(entries) {
  mkdirSync(dirname(LOG), { recursive: true });
  writeFileSync(LOG, JSON.stringify(entries, null, 2));
}

const [, , cmd, ...rest] = process.argv;

if (cmd === '--record') {
  const [feature, verdict] = rest;
  if (!feature) {
    console.error('Uso: --record <feature> <verdict>');
    process.exit(1);
  }
  const entries = readLog();
  entries.push({
    feature,
    hash: currentHash(),
    verdict: verdict ?? 'PASS',
    date: new Date().toISOString(),
  });
  writeLog(entries);
  console.log(`✓ Registrado: feature=${feature} hash=${currentHash()} verdict=${verdict ?? 'PASS'}`);
  process.exit(0);
}

if (cmd === '--check') {
  const now = currentHash();
  const entries = readLog();
  // last validated hash per feature
  const lastByFeature = new Map();
  for (const e of entries) lastByFeature.set(e.feature, e.hash);
  const stale = [...lastByFeature.entries()].filter(([, h]) => h !== now);

  console.log(`design.md hash actual: ${now}`);
  if (entries.length === 0) {
    console.log('Sin validaciones registradas todavía.');
    process.exit(0);
  }
  if (stale.length === 0) {
    console.log(`✓ Todas las features validadas (${lastByFeature.size}) lo fueron contra el design.md actual.`);
    process.exit(0);
  }
  console.warn(`\n⚠ design.md cambió desde que se validaron estas features (STALE):`);
  for (const [feature, hash] of stale) {
    console.warn(`  - ${feature}: validada contra ${hash}, actual ${now} → re-corre design-critic`);
  }
  process.exit(3);
}

if (cmd === '--verify') {
  const [feature] = rest;
  if (!feature) {
    console.error('Uso: --verify <feature>');
    process.exit(1);
  }
  const now = currentHash();
  const prior = readLog().filter((e) => e.feature === feature);
  if (prior.length === 0) {
    console.log(`✓ ${feature}: sin baseline previo (feature nueva). OK.`);
    process.exit(0);
  }
  const last = prior[prior.length - 1].hash;
  if (last === now) {
    console.log(`✓ ${feature}: consistente con el design.md actual (${now}).`);
    process.exit(0);
  }
  console.error(
    `\n✗ ${feature} ya se validó contra design.md=${last}, pero ahora es ${now}.\n` +
      `  El baseline visual cambió bajo una feature ya firmada. Sin excusa:\n` +
      `  re-implementa esta feature contra el design.md nuevo, o re-registra\n` +
      `  explícitamente con --record tras re-puntuar con el critic.`,
  );
  process.exit(4);
}

console.error('Comando desconocido. Usa --check, --verify <feature>, o --record <feature> <verdict>.');
process.exit(1);
