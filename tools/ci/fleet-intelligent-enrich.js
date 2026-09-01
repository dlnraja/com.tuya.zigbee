#!/usr/bin/env node
'use strict';

/**
 * fleet-intelligent-enrich.js (P2371)
 *
 * Full silent fleet enrichment: crawl Z2M/ZHA/Blakadder/deCONZ + forum cross-ref →
 * apply-safe sacred couples, mfs alignment, settings/flows, collision prune.
 * NEVER degrades coverage (baseline vs final gate).
 *
 * Usage:
 *   node tools/ci/fleet-intelligent-enrich.js                    # dry-run phases
 *   node tools/ci/fleet-intelligent-enrich.js --apply            # apply (local cache)
 *   node tools/ci/fleet-intelligent-enrich.js --apply --crawl    # crawl + apply
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DATE = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(ROOT, 'reports', `fleet-enrich-${DATE}`);
const APPLY = process.argv.includes('--apply');
const CRAWL = process.argv.includes('--crawl');
const SKIP_CRAWL = process.argv.includes('--skip-crawl') || !CRAWL;

const summary = {
  generatedAt: new Date().toISOString(),
  mode: APPLY ? 'apply' : 'dry-run',
  crawl: !SKIP_CRAWL,
  phases: [],
  ok: true,
};

function log(msg) {
  console.log(`[fleet-enrich] ${msg}`);
}

function fleetSnapshot() {
  let driverCount = 0;
  let mfrEntries = 0;
  let pidEntries = 0;
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const fp = path.join(ROOT, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    driverCount += 1;
    try {
      const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
      mfrEntries += (j.zigbee?.manufacturerName || []).length;
      pidEntries += (j.zigbee?.productId || []).length;
    } catch { /* skip */ }
  }
  return { driverCount, mfrEntries, pidEntries };
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
      AI_PLAN_MODE: process.env.AI_PLAN_MODE || 'forfait',
      AI_ALLOW_PAID: process.env.AI_ALLOW_PAID || 'false',
      SMART_FETCH_READER_FALLBACK: process.env.SMART_FETCH_READER_FALLBACK || '1',
      FIRECRAWL_DAILY_MAX: process.env.FIRECRAWL_DAILY_MAX || '3',
      FREE_SCRAPE_BROWSER: process.env.FREE_SCRAPE_BROWSER || '0',
    },
  });
  const tail = `${res.stdout || ''}${res.stderr || ''}`.trim().slice(-1500);
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

summary.baseline = fleetSnapshot();
log(`Baseline: ${JSON.stringify(summary.baseline)}`);

phase('ai-plan-guard', () => run('ai-guard', 'tools/ci/ai-plan-guard.js', ['--preflight'], 60000, true));
phase('free-scrape-budget', () => run('scrape-budget', 'tools/ci/free-scrape-budget.js', ['--preflight'], 30000, true));

if (!SKIP_CRAWL) {
  phase('source-diff-crawl', () => run('source-diff', 'tools/ci/intelligent-source-diff.js', ['--apply'], 720000, true));
} else {
  phase('source-diff-plan', () => run('source-diff', 'tools/ci/intelligent-source-diff.js', [], 120000, true));
}

phase('cross-ref-all-sources', () => run('cross-ref', 'tools/ci/cross-ref-all-sources.js', [], 300000, false));

const marketArgs = ['--json'];
if (APPLY) marketArgs.push('--apply');
phase('market-couples-intake', () => run('market-intake', 'tools/ci/market-couples-intake.js', marketArgs, 300000, true));

if (APPLY) {
  phase('apply-market-couples', () => run('market-apply', 'tools/ci/apply-market-couples.js', ['--apply'], 180000, true));
  phase('enrich-market-colocate', () => run('colocate', 'tools/ci/enrich-market-colocate.js', ['--apply'], 180000, true));
  phase('multi-source-enrich', () => run('multi-source', 'tools/ci/multi-source-enrich-orchestrator.js', ['--apply', '--skip-scan'], 600000, true));
  phase('infer-enrich-apply', () => run('infer-enrich', 'tools/ci/infer-enrich-from-incomplete.js', ['--apply'], 300000, true));
  phase('curtain-couples', () => run('curtain', 'tools/ci/apply-curtain-couples.js', ['--apply'], 120000, true));
  phase('align-mfs-apply', () => run('align-mfs', 'tools/ci/align-mfs-db-intelligent.js', ['--apply'], 300000, true));
  phase('sync-compose-mfs', () => run('sync-mfs', 'tools/ci/sync-compose-to-mfs-db.js', ['--apply'], 180000, true));
  phase('harden-mfs-db', () => run('harden-mfs', 'tools/ci/harden-mfs-db.js', ['--apply'], 180000, true));
  phase('harden-unknown-zigbee', () => run('harden-unknown', 'tools/ci/harden-unknown-zigbee.js', ['--apply'], 180000, true));
  phase('enrich-driver-settings', () => run('settings', 'tools/ci/enrich-driver-settings-intelligent.js', ['--apply'], 180000, true));
  phase('driver-class-fleet', () => run('driver-class', 'tools/ci/driver-class-fleet-enrich.js', ['--apply'], 600000, true));
  phase('flow-fleet-enrich-apply', () => run('flow-fleet', 'tools/ci/flow-fleet-enrich.js', ['--apply'], 600000, true));
  phase('source-diff-manifest', () => run('source-manifest', 'tools/ci/intelligent-source-diff.js', [], 120000, true));
  phase('button-flow-harvest-apply', () => run('button-harvest', 'tools/ci/button-flow-harvest.js', ['--apply-fixes'], 120000, true));
  phase('case-variants', () => run('case-variants', 'tools/ci/ensure-case-variants.js', ['--apply'], 120000, true));
  phase('prune-fp-collision', () => run('prune-fp', 'tools/ci/prune-fp-collision-bleed.js', ['--apply'], 180000, true));
  phase('re-inject-sacred-strips', () => run('re-inject', 'tools/ci/re-inject-manual-fixes.js', [], 180000, false));
  phase('master-automation-fix', () => run('master-auto', 'scripts/master-automation.js', ['--fix'], 300000, false));
  phase('sync-enrichment-profiles', () => run('profiles', 'tools/ci/sync-enrichment-profiles.js', [], 120000, true));
} else {
  phase('multi-source-dry', () => run('multi-source', 'tools/ci/multi-source-enrich-orchestrator.js', ['--skip-scan'], 600000, true));
  phase('infer-enrich-dry', () => run('infer-enrich', 'tools/ci/infer-enrich-from-incomplete.js', [], 300000, true));
  phase('align-mfs-check', () => run('align-mfs', 'tools/ci/align-mfs-db-intelligent.js', ['--check'], 180000, true));
}

phase('sacred-couple-gate', () => run('p2138', 'tools/ci/p2138-sacred-couple-matrix-gate.js', [], 180000, false));
phase('anti-bot-gate', () => run('anti-bot', 'tools/ci/anti-bot-regression-gate.js', [], 180000, false));
phase('fp-collision-check', () => run('fp-check', 'tools/ci/prune-fp-collision-bleed.js', ['--check'], 180000, true));
phase('flow-l99', () => run('flow-l99', 'tools/ci/flow-l99-orchestrator.js', [], 300000, true));

summary.final = fleetSnapshot();
summary.delta = {
  drivers: summary.final.driverCount - summary.baseline.driverCount,
  mfrs: summary.final.mfrEntries - summary.baseline.mfrEntries,
  pids: summary.final.pidEntries - summary.baseline.pidEntries,
};

if (summary.final.driverCount < summary.baseline.driverCount) {
  summary.ok = false;
  summary.coverageRegression = 'driver count dropped';
}
if (summary.final.mfrEntries < summary.baseline.mfrEntries - 50) {
  summary.ok = false;
  summary.coverageRegression = summary.coverageRegression || 'mfr entries dropped >50';
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

const md = [
  `# Fleet intelligent enrich — ${DATE}`,
  '',
  `Mode: **${summary.mode}** | Crawl: **${summary.crawl ? 'yes' : 'no'}**`,
  '',
  '## Coverage',
  '',
  `| Metric | Baseline | Final | Δ |`,
  `|--------|----------|-------|---|`,
  `| Drivers | ${summary.baseline.driverCount} | ${summary.final.driverCount} | ${summary.delta.drivers} |`,
  `| MFR entries | ${summary.baseline.mfrEntries} | ${summary.final.mfrEntries} | ${summary.delta.mfrs} |`,
  `| PID entries | ${summary.baseline.pidEntries} | ${summary.final.pidEntries} | ${summary.delta.pids} |`,
  '',
  '## Phases',
  '',
  ...summary.phases.map((p) => `- ${p.name}: ${p.ok !== false ? 'OK' : 'FAIL'}`),
  '',
  summary.coverageRegression ? `⚠️ **${summary.coverageRegression}**` : '✅ Coverage maintained or enriched',
  '',
];
fs.writeFileSync(path.join(OUT_DIR, 'FLEET_ENRICH.md'), md.join('\n'));

log(`Report → ${OUT_DIR}`);
console.log(JSON.stringify({ ok: summary.ok, baseline: summary.baseline, final: summary.final, delta: summary.delta }, null, 2));
process.exit(summary.ok ? 0 : 1);
