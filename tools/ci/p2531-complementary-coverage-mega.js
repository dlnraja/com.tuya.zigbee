#!/usr/bin/env node
'use strict';

/**
 * P2531 — Complementary coverage mega enrich
 *
 * WHY: One pass that scrapes Homey forum + Z2M/ZHA/Blakadder/alt sources,
 *      then unions OEM overlays / case variants / caps / settings / flows
 *      without wiping generics (P2520 complementary only).
 * HOW: Soft-chain existing orchestrators; never invent pid; never forum POST.
 * POUR QUI: Master Test soak + Stable reliability backport (BOTH).
 * QUAND: Explicit maintainer ask / L99 mega enrich.
 * CONTRE QUOI: Shallow mfr-only closes; capability shrink; sacred drop.
 *
 *   node tools/ci/p2531-complementary-coverage-mega.js
 *   node tools/ci/p2531-complementary-coverage-mega.js --apply
 *   node tools/ci/p2531-complementary-coverage-mega.js --apply --crawl
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const APPLY = process.argv.includes('--apply');
const CRAWL = process.argv.includes('--crawl');
const SKIP_FORUM = process.argv.includes('--skip-forum');
const DATE = new Date().toISOString().slice(0, 10);
const OUT = path.join(ROOT, `reports/p2531-coverage-${DATE}`);

const summary = {
  id: 'P2531',
  generatedAt: new Date().toISOString(),
  mode: APPLY ? 'apply' : 'dry-run',
  crawl: CRAWL,
  phases: [],
  ok: true,
};

function log(msg) {
  console.log(`[P2531] ${msg}`);
}

function snapshot() {
  let drivers = 0;
  let mfrs = 0;
  let pids = 0;
  const dir = path.join(ROOT, 'drivers');
  for (const id of fs.readdirSync(dir)) {
    const fp = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    drivers += 1;
    try {
      const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
      mfrs += (j.zigbee?.manufacturerName || []).length;
      pids += (j.zigbee?.productId || []).length;
    } catch { /* skip */ }
  }
  return { drivers, mfrs, pids };
}

function run(label, relOrNpm, args = [], timeoutMs = 600000, soft = true) {
  const t0 = Date.now();
  let cmd;
  let cmdArgs;
  let useShell = false;
  if (relOrNpm.startsWith('npm:')) {
    cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    cmdArgs = ['run', relOrNpm.slice(4), '--', ...args];
    useShell = true;
  } else {
    const script = path.join(ROOT, relOrNpm);
    if (!fs.existsSync(script)) {
      const entry = { label, ok: soft, skipped: true, reason: 'missing', script: relOrNpm };
      summary.phases.push(entry);
      log(`~ ${label} (missing)`);
      return entry;
    }
    cmd = process.execPath;
    cmdArgs = [script, ...args];
    useShell = false;
  }
  const res = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: {
      ...process.env,
      FORUM_AUTO_POST: '0',
      SHADOW_FORUM: '1',
      REPLY_TOPICS: '140352',
      AI_PLAN_MODE: process.env.AI_PLAN_MODE || 'forfait',
      AI_ALLOW_PAID: 'false',
      SMART_FETCH_READER_FALLBACK: '1',
      FIRECRAWL_DAILY_MAX: process.env.FIRECRAWL_DAILY_MAX || '5',
      FREE_SCRAPE_BROWSER: '0',
    },
    maxBuffer: 8 * 1024 * 1024,
    shell: useShell,
    windowsHide: true,
  });
  const ok = res.status === 0;
  if (!ok && !soft) summary.ok = false;
  const errHint = res.error ? String(res.error.message || res.error) : '';
  const entry = {
    label,
    ok: soft ? true : ok,
    hardOk: ok,
    exitCode: res.status,
    durationMs: Date.now() - t0,
    error: errHint || undefined,
    tail: `${res.stdout || ''}${res.stderr || ''}${errHint}`.trim().slice(-1200),
  };
  summary.phases.push(entry);
  log(`${ok ? '✓' : (soft ? '~' : '✗')} ${label} (${(entry.durationMs / 1000).toFixed(1)}s)`);
  if (!ok && entry.tail) {
    console.log(`  tail: ${entry.tail.slice(-400).replace(/\s+/g, ' ')}`);
  }
  return entry;
}

fs.mkdirSync(OUT, { recursive: true });
summary.baseline = snapshot();
log(`baseline ${JSON.stringify(summary.baseline)} mode=${summary.mode} crawl=${CRAWL}`);

// 1) Homey forum silent — subtleties / recurring bugs
if (!SKIP_FORUM) {
  run('forum-silent-scan', 'tools/ci/forum-silent-multi-scan.js', ['--max=60'], 420000, true);
  run('forum-process', 'tools/ci/forum-actionable-processor.js', [], 300000, true);
  run('forum-media', 'tools/ci/forum-media-deep-scan.js', ['--max=40'], 300000, true);
}

// 2) External Zigbee ecosystems (Z2M / ZHA / Blakadder / alts)
if (CRAWL) {
  run('mega-z2m', 'tools/ci/mega-crawler.js', ['--only=z2m', '--timeout=180'], 240000, true);
  run('mega-zha', 'tools/ci/mega-crawler.js', ['--only=zha', '--timeout=180'], 240000, true);
  run('mega-blakadder', 'tools/ci/mega-crawler.js', ['--only=blakadder', '--timeout=180'], 240000, true);
  run('mega-deconz', 'tools/ci/mega-crawler.js', ['--only=deconz', '--timeout=120'], 180000, true);
  run('source-diff', 'tools/ci/intelligent-source-diff.js', APPLY ? ['--apply'] : [], 720000, true);
}

run('cross-ref-all', 'tools/ci/cross-ref-all-sources.js', [], 300000, true);

// 3) Complementary fleet + multi-source (union OEM overlays on generics)
const fleetArgs = [];
if (APPLY) fleetArgs.push('--apply');
if (CRAWL) fleetArgs.push('--crawl');
else fleetArgs.push('--skip-crawl');
run('fleet-intelligent', 'tools/ci/fleet-intelligent-enrich.js', fleetArgs, 900000, true);

run(
  'multi-source',
  'tools/ci/multi-source-enrich-orchestrator.js',
  APPLY ? ['--apply', '--skip-scan'] : ['--skip-scan'],
  600000,
  true,
);

// 4) Recent sacred couples OEM/case/caps + deep functional (DP/flow/RX-TX)
run(
  'variants-recent',
  'tools/ci/recent-variant-capability-completer.js',
  APPLY ? ['--apply'] : [],
  180000,
  true,
);
run('deep-functional', 'tools/ci/deep-functional-enrich-pass.js', ['--skip-gates'], 180000, true);
run('case-variants', 'tools/ci/ensure-case-variants.js', APPLY ? ['--apply'] : [], 180000, true);

if (APPLY) {
  run('strip-forbidden', 'tools/ci/strip-registry-forbidden-compose.js', ['--apply'], 180000, false);
  run('re-inject-sacred', 'tools/ci/re-inject-manual-fixes.js', [], 180000, false);
  run('dimmer-fw-sync', 'tools/ci/p2530d-wall-dimmer-firmware-mfr-sync.js', [], 60000, true);
}

// 5) Hard gates Contre quoi
run('gate-p2138', 'tools/ci/p2138-sacred-couple-matrix-gate.js', [], 180000, false);
run('gate-p2519', 'tools/ci/p2519-anti-regression-enrich-gate.js', [], 120000, false);
run('gate-p2520', 'tools/ci/p2520-complementary-variant-enrich-gate.js', [], 120000, false);
run('gate-anti-bot', 'tools/ci/anti-bot-regression-gate.js', [], 180000, false);
run('check-p2530', 'npm:check:p2530', [], 120000, false);

summary.final = snapshot();
summary.delta = {
  drivers: summary.final.drivers - summary.baseline.drivers,
  mfrs: summary.final.mfrs - summary.baseline.mfrs,
  pids: summary.final.pids - summary.baseline.pids,
};
if (summary.final.drivers < summary.baseline.drivers) {
  summary.ok = false;
  summary.coverageRegression = 'driver count dropped';
}
if (summary.final.mfrs < summary.baseline.mfrs - 80) {
  summary.ok = false;
  summary.coverageRegression = summary.coverageRegression || 'mfr entries dropped >80';
}

fs.writeFileSync(path.join(OUT, 'SUMMARY.json'), `${JSON.stringify(summary, null, 2)}\n`);
const md = [
  `# P2531 complementary coverage mega — ${DATE}`,
  '',
  `Mode: **${summary.mode}** | Crawl: **${CRAWL ? 'yes' : 'no'}** | ok=${summary.ok}`,
  '',
  '| Metric | Before | After | Δ |',
  '|--------|--------|-------|---|',
  `| Drivers | ${summary.baseline.drivers} | ${summary.final.drivers} | ${summary.delta.drivers} |`,
  `| MFR entries | ${summary.baseline.mfrs} | ${summary.final.mfrs} | ${summary.delta.mfrs} |`,
  `| PID entries | ${summary.baseline.pids} | ${summary.final.pids} | ${summary.delta.pids} |`,
  '',
  '## Phases',
  '',
  ...summary.phases.map((p) => `- ${p.label}: ${p.hardOk ? 'OK' : (p.skipped ? 'skip' : 'soft-fail')}`),
  '',
  summary.coverageRegression ? `⚠️ ${summary.coverageRegression}` : '✅ Coverage maintained or enriched (complementary)',
  '',
  'Sources: Homey forum silent, Z2M, ZHA, Blakadder, deCONZ, market couples, OEM case overlays.',
  'Never forum POST (T157628). Never invent pid.',
  '',
];
fs.writeFileSync(path.join(OUT, 'COVERAGE.md'), md.join('\n'));
log(`report → ${OUT}`);
console.log(JSON.stringify({ ok: summary.ok, baseline: summary.baseline, final: summary.final, delta: summary.delta }, null, 2));
process.exit(summary.ok ? 0 : 1);
