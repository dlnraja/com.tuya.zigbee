#!/usr/bin/env node
'use strict';

/**
 * harvest-all-sources.js (P2365)
 *
 * Full silent harvest: Z2M + ZHA + Blakadder + deCONZ + cross-ref → apply-safe
 * sacred couples into driver.compose.json. Never invents productId.
 *
 * Usage:
 *   node tools/ci/harvest-all-sources.js              # crawl + dry apply preview
 *   node tools/ci/harvest-all-sources.js --apply      # write compose + mfs align
 *   node tools/ci/harvest-all-sources.js --skip-crawl # use local caches only
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DATE = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(ROOT, 'reports', `harvest-all-${DATE}`);
const APPLY = process.argv.includes('--apply');
const SKIP_CRAWL = process.argv.includes('--skip-crawl');

const summary = {
  generatedAt: new Date().toISOString(),
  mode: APPLY ? 'apply' : 'dry-run',
  phases: [],
  ok: true,
};

function log(msg) {
  console.log(`[harvest-all] ${msg}`);
}

function run(label, rel, args = [], timeoutMs = 300000, soft = false) {
  const script = path.join(ROOT, rel);
  if (!fs.existsSync(script)) {
    return { label, ok: soft, skipped: true, reason: 'missing', script: rel };
  }
  const t0 = Date.now();
  const res = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: {
      ...process.env,
      FORUM_AUTO_POST: '0',
      SHADOW_FORUM: '1',
      SMART_FETCH_READER_FALLBACK: process.env.SMART_FETCH_READER_FALLBACK || '1',
    },
  });
  const tail = `${res.stdout || ''}${res.stderr || ''}`.trim().slice(-1200);
  const ok = res.status === 0;
  if (!ok && !soft) summary.ok = false;
  return { label, ok, exitCode: res.status, durationMs: Date.now() - t0, tail };
}

function phase(name, fn) {
  log(`▶ ${name}`);
  const entry = { name, ...fn() };
  summary.phases.push(entry);
  log(entry.ok === false ? `✗ ${name}` : `✓ ${name}`);
  return entry;
}

if (!SKIP_CRAWL) {
  phase('crawl-z2m', () => run('crawl-z2m', 'scripts/sync/crawl-z2m.js', [], 360000, true));
  phase('crawl-zha', () => run('crawl-zha', 'scripts/sync/crawl-zha.js', [], 360000, true));
  phase('crawl-blakadder', () => run('crawl-blakadder', 'scripts/sync/crawl-blakadder.js', [], 360000, true));
  phase('crawl-deconz', () => run('crawl-deconz', 'scripts/sync/crawl-deconz.js', [], 240000, true));
  phase('blakadder-cross-ref', () => run('blakadder-xref', 'tools/ci/blakadder-cross-ref.js', [], 180000, true));
}

phase('cross-ref-all-sources', () => run('cross-ref', 'tools/ci/cross-ref-all-sources.js', [], 300000, false));

const marketArgs = ['--json'];
if (APPLY) marketArgs.push('--apply');
phase('market-couples-intake', () => run('market-intake', 'tools/ci/market-couples-intake.js', marketArgs, 300000, true));

phase('curtain-couples', () => run('curtain', 'tools/ci/apply-curtain-couples.js', APPLY ? ['--apply'] : [], 120000, true));

phase('button-flow-harvest', () => run('button-harvest', 'tools/ci/button-flow-harvest.js', [], 120000, true));

if (APPLY) {
  phase('multi-source-enrich', () => run('multi-source', 'tools/ci/multi-source-enrich-orchestrator.js', ['--apply', '--skip-scan'], 600000, true));
  phase('case-variants', () => run('case-variants', 'tools/ci/ensure-case-variants.js', ['--apply'], 120000, true));
}

phase('sacred-couple-gate', () => run('p2138-gate', 'tools/ci/p2138-sacred-couple-matrix-gate.js', [], 180000, true));

phase('align-mfs-check', () => run('align-mfs', 'tools/ci/align-mfs-db-intelligent.js', ['--check'], 180000, true));

// Snapshot stats
try {
  const intake = JSON.parse(fs.readFileSync(path.join(ROOT, '.github/state/market-couples/intake.json'), 'utf8'));
  summary.market = {
    marketNew: intake.marketNew,
    applySafe: intake.applySafe,
    needsReview: intake.needsReview,
    blakadderNew: intake.blakadderNew,
  };
} catch { /* optional */ }

try {
  const curtain = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports/curtain-apply-latest.json'), 'utf8'));
  summary.curtain = { stripped: curtain.stripped_from_curtain_motor, total: curtain.curtainMfrCount };
} catch { /* optional */ }

try {
  const btn = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports', `button-flow-harvest-${DATE}`, 'summary.json'), 'utf8'));
  summary.buttons = { drivers: btn.driverCount, triggers: btn.totalTriggers };
} catch { /* optional */ }

let driverCount = 0;
let mfrEntries = 0;
for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  const fp = path.join(ROOT, 'drivers', d, 'driver.compose.json');
  if (!fs.existsSync(fp)) continue;
  driverCount++;
  try {
    const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
    mfrEntries += (j.zigbee?.manufacturerName || []).length;
  } catch { /* skip */ }
}
summary.fleet = { driverCount, manufacturerNameEntries: mfrEntries };

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

const md = [
  `# Harvest all sources — ${DATE}`,
  '',
  `Mode: **${summary.mode}**`,
  '',
  '| Phase | OK |',
  '|-------|----|',
  ...summary.phases.map((p) => `| ${p.name} | ${p.ok !== false ? 'yes' : 'NO'} |`),
  '',
  '## Fleet',
  '',
  `- Drivers: ${summary.fleet.driverCount}`,
  `- manufacturerName entries: ${summary.fleet.manufacturerNameEntries}`,
  '',
];
if (summary.market) {
  md.push('## Market couples', '', `- market-new: ${summary.market.marketNew}`, `- apply-safe: ${summary.market.applySafe}`, `- needs review: ${summary.market.needsReview}`, '');
}
fs.writeFileSync(path.join(OUT_DIR, 'HARVEST.md'), md.join('\n'));

log(`Report → ${OUT_DIR}`);
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 1);
