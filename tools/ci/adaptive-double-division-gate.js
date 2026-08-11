#!/usr/bin/env node
/**
 * P120 — Adaptive double-division residual gate (report → hard)
 *
 * Flags driver/lib paths that risk AdaptiveDataParser *and* a local divisor
 * on the same DP handling chain. Soft by default; --hard exits non-zero.
 *
 * Usage:
 *   node tools/ci/adaptive-double-division-gate.js
 *   node tools/ci/adaptive-double-division-gate.js --hard
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const HARD = process.argv.includes('--hard');
const hits = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === '.homeybuild') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name.endsWith('.js')) scan(p);
  }
}

function scan(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  // Skip the Adaptive parser itself and SmartDivisorManager
  if (rel.includes('AdaptiveDataParser') || rel.includes('SmartDivisorManager')) return;
  if (rel.includes('adaptive-double-division-gate')) return;

  const s = fs.readFileSync(file, 'utf8');
  const hasAdaptive = /AdaptiveDataParser\.to(Temperature|Humidity|Battery|Illuminance|Voltage|Current|Power)/.test(s);
  const hasLocalDiv = /\bdivisor\s*[:=]\s*\d+|smartDivisorDetect|value\s*\/\s*(10|100)\b/.test(s);
  if (hasAdaptive && hasLocalDiv) {
    hits.push({ file: rel, reason: 'AdaptiveDataParser + local divisor/smartDivisor in same file' });
  }
}

walk(path.join(ROOT, 'drivers'));
walk(path.join(ROOT, 'lib'));

const outDir = path.join(ROOT, '.github', 'state');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  hard: HARD,
  hits: hits.length,
  files: hits,
};
fs.writeFileSync(path.join(outDir, 'adaptive-double-division-gate.json'), `${JSON.stringify(report, null, 2)}\n`);

console.log(`[adaptive-double-division-gate] hits=${hits.length} mode=${HARD ? 'hard' : 'soft'}`);
for (const h of hits.slice(0, 20)) console.log(`  ${h.file}: ${h.reason}`);
if (hits.length > 20) console.log(`  … +${hits.length - 20} more`);

if (HARD && hits.length) process.exit(1);
