#!/usr/bin/env node
/**
 * check-agent-models.mjs — guard against agent-model drift.
 *
 * Fixes critiques #5 (model declared in TWO places: opencode.json AND each
 * .opencode/agents/*.md frontmatter, with no enforcement) and #9 (model IDs
 * unverified against the opencode-go catalog).
 *
 * Checks, and exits non-zero on any failure:
 *   1. SYNC     — an agent present in BOTH opencode.json and its .md frontmatter
 *                 must declare the SAME model.
 *   2. NO-CLAUDE— no agent may declare an anthropic/claude* model (subscription
 *                 is opencode-go; Claude models are not invocable).
 *   3. CATALOG  — every declared model must exist in the opencode-go provider of
 *                 ~/.cache/opencode/models.json (skipped with a WARN if the
 *                 catalog file is absent — e.g. CI).
 *
 * Zero dependencies. Run: node .opencode/scripts/check-agent-models.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const agentsDir = join(repoRoot, '.opencode', 'agents');
const opencodeJsonPath = join(repoRoot, 'opencode.json');
const catalogPath = join(homedir(), '.cache', 'opencode', 'models.json');

const errors = [];
const warnings = [];

/** Extract the `model:` value from a markdown file's YAML frontmatter. */
function frontmatterModel(mdPath) {
  const text = readFileSync(mdPath, 'utf8');
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  const fm = end === -1 ? text : text.slice(0, end);
  const m = /\nmodel:\s*(\S+)/.exec(fm);
  return m ? m[1] : null;
}

/** Bare model id without the provider prefix (e.g. opencode-go/x → x). */
function bareId(model) {
  const i = model.indexOf('/');
  return i === -1 ? model : model.slice(i + 1);
}

function isClaude(model) {
  return /anthropic|claude/i.test(model);
}

// --- gather declarations -----------------------------------------------------
const jsonModels = new Map(); // agent → model
try {
  const oc = JSON.parse(readFileSync(opencodeJsonPath, 'utf8'));
  for (const [name, cfg] of Object.entries(oc.agent ?? {})) {
    if (cfg && typeof cfg.model === 'string') jsonModels.set(name, cfg.model);
  }
} catch (e) {
  errors.push(`No pude leer/parsear opencode.json: ${e.message}`);
}

const mdModels = new Map(); // agent → model
for (const file of readdirSync(agentsDir).filter((f) => f.endsWith('.md'))) {
  const name = basename(file, '.md');
  const model = frontmatterModel(join(agentsDir, file));
  if (model) mdModels.set(name, model);
}

// --- 1. SYNC -----------------------------------------------------------------
for (const [name, jsonModel] of jsonModels) {
  const mdModel = mdModels.get(name);
  if (mdModel && mdModel !== jsonModel) {
    errors.push(`SYNC · ${name}: opencode.json="${jsonModel}" ≠ frontmatter="${mdModel}"`);
  }
}

// Unique {name, model} pairs across both sources (avoid double-reporting).
const uniquePairs = [...new Map(
  [...jsonModels, ...mdModels].map(([name, model]) => [`${name}:${model}`, { name, model }]),
).values()];

// --- 2. NO-CLAUDE ------------------------------------------------------------
for (const { name, model } of uniquePairs) {
  if (isClaude(model)) errors.push(`NO-CLAUDE · ${name}: modelo Claude no invocable → "${model}"`);
}

// --- 3. CATALOG --------------------------------------------------------------
if (existsSync(catalogPath)) {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const og = JSON.stringify(catalog['opencode-go'] ?? {});
  for (const { name, model } of uniquePairs) {
    if (isClaude(model)) continue; // already flagged
    if (!og.includes(`"${bareId(model)}"`)) {
      errors.push(`CATALOG · ${name}: "${model}" no existe en el provider opencode-go`);
    }
  }
} else {
  warnings.push(`Catálogo no encontrado (${catalogPath}) — omito el chequeo CATALOG.`);
}

// --- report ------------------------------------------------------------------
for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length === 0) {
  console.log(`✓ Agentes OK: ${jsonModels.size} en opencode.json, ${mdModels.size} en frontmatter, sincronizados y sin Claude.`);
  process.exit(0);
}
console.error(`\n✗ ${errors.length} problema(s) de modelos de agente:`);
for (const e of errors) console.error(`  - ${e}`);
process.exit(1);
