#!/usr/bin/env node
'use strict';

/**
 * market-couples-intake.js (P2231)
 *
 * Regular recovery of new sacred couples (manufacturerName + productId) from
 * market sources: Blakadder, Z2M, ZHA, deCONZ, forum SHADOW, Gmail, Johan.
 *
 * NEVER invents pid. NEVER auto-applies to compose without sacred gates.
 *
 * Usage:
 *   node tools/ci/market-couples-intake.js              # use cached crawl data
 *   node tools/ci/market-couples-intake.js --crawl     # refresh blakadder+z2m+zha first
 *   node tools/ci/market-couples-intake.js --check     # CI: fail if high-severity mfs drift
 *   node tools/ci/market-couples-intake.js --json
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'market-couples');
const SSOT = path.join(ROOT, 'config', 'enrichment', 'market-couples-sources.json');

const DO_CRAWL = process.argv.includes('--crawl');
const CHECK = process.argv.includes('--check');
const JSON_MODE = process.argv.includes('--json');

function log(msg) {
  console.log(`[market-couples] ${msg}`);
}

function runNode(rel, args = [], timeoutMs = 300000) {
  const script = path.join(ROOT, rel);
  if (!fs.existsSync(script)) {
    return { ok: false, skipped: true, reason: 'missing', script: rel };
  }
  const res = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: {
      ...process.env,
      SMART_FETCH_READER_FALLBACK: process.env.SMART_FETCH_READER_FALLBACK || '1',
    },
  });
  return {
    ok: res.status === 0,
    exitCode: res.status,
    tail: `${res.stdout || ''}${res.stderr || ''}`.trim().slice(-600),
    script: rel,
  };
}

function loadSsot() {
  try {
    return JSON.parse(fs.readFileSync(SSOT, 'utf8'));
  } catch {
    return { crawlers: [], marketSources: [] };
  }
}

function lookupDriver(mfr, pid) {
  try {
    const DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB.js'));
    const hit = DeviceFingerprintDB.lookup(mfr, pid);
    return hit?.driver || null;
  } catch {
    return null;
  }
}

function renderMarkdown(report) {
  const lines = [
    '# Market couples intake — ' + report.generatedAt.slice(0, 10),
    '',
    'Sacred couple only (mfr+pid). Silent enrichment — no forum posts.',
    '',
    `| Metric | Count |`,
    `|--------|------:|`,
    `| Total unique pairs | ${report.totalPairs} |`,
    `| Market-new (not in compose) | ${report.marketNew} |`,
    `| With DB route hint | ${report.withRouteHint} |`,
    `| Needs review | ${report.needsReview} |`,
    '',
    '## Sources',
    '',
  ];
  for (const [k, v] of Object.entries(report.bySource || {})) {
    lines.push(`- **${k}**: ${v} pairs`);
  }
  lines.push('', '## Top market-new (not in driver.compose)', '');
  lines.push('| Couple | Sources | Route hint |');
  lines.push('|--------|---------|------------|');
  for (const c of (report.topMarketNew || []).slice(0, 40)) {
    lines.push(`| \`${c.mfr}+${c.pid}\` | ${c.sources.join(', ')} | ${c.routeHint || '—'} |`);
  }
  lines.push('', 'Regenerate: `npm run market:couples` · crawl: `npm run market:couples:crawl`');
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });

  const ssot = loadSsot();
  const crawlResults = [];

  if (DO_CRAWL) {
    log('Crawling market sources…');
    for (const c of ssot.crawlers || []) {
      log(`  crawl ${c.id}`);
      const r = runNode(c.cmd.replace(/^node /, ''), [], 240000);
      crawlResults.push({ id: c.id, ...r });
      if (!r.ok && !c.optional) log(`  warn: ${c.id} crawl exit ${r.exitCode}`);
    }
    // Forum + gmail are refreshed by auto-enrich; optional light pull
    runNode('tools/ci/blakadder-cross-ref.js', [], 120000);
  }

  log('Cross-referencing all sources…');
  const xref = runNode('tools/ci/cross-ref-all-sources.js', [], 180000);
  if (!xref.ok) {
    console.error('cross-ref-all-sources failed:', xref.tail);
    if (CHECK) process.exit(1);
  }

  const summaryPath = path.join(ROOT, '.github', 'state', 'mfr-pid-cross-ref.json');
  if (!fs.existsSync(summaryPath)) {
    console.error('FATAL: mfr-pid-cross-ref.json missing');
    process.exit(1);
  }
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

  const enriched = (summary.marketNewList || []).map((c) => {
    const routeHint = lookupDriver(c.mfr, c.pid);
    return { ...c, routeHint, needsReview: !routeHint };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    mode: DO_CRAWL ? 'crawl+cross-ref' : 'cross-ref-only',
    totalPairs: summary.totalUniquePairs,
    marketNew: summary.marketNew,
    bySource: summary.bySource,
    withRouteHint: enriched.filter((c) => c.routeHint).length,
    needsReview: enriched.filter((c) => c.needsReview).length,
    topMarketNew: enriched.slice(0, 100),
    crawlResults,
    crossRef: { ok: xref.ok, tail: xref.tail },
  };

  fs.writeFileSync(path.join(STATE_DIR, 'intake.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(STATE_DIR, 'NEED_REVIEW.md'), renderMarkdown(report));

  log(`market-new: ${report.marketNew} | route hints: ${report.withRouteHint} | review: ${report.needsReview}`);
  log(`Wrote ${path.relative(ROOT, path.join(STATE_DIR, 'intake.json'))}`);

  if (CHECK) {
    const align = runNode('tools/ci/align-mfs-db-intelligent.js', ['--check'], 120000);
    const gate = runNode('tools/ci/p2138-sacred-couple-matrix-gate.js', [], 120000);
    if (!align.ok || !gate.ok) {
      console.error('CHECK failed (align or sacred gate)');
      process.exit(1);
    }
    log('CHECK passed');
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  }

  return report;
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('FATAL:', e.stack || e.message);
    process.exit(1);
  }
}

module.exports = { main };
