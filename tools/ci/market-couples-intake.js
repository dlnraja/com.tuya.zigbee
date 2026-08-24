#!/usr/bin/env node
'use strict';

/**
 * market-couples-intake.js (P2231)
 *
 * Regular recovery of new sacred couples (manufacturerName + productId) from
 * market sources: Blakadder, Z2M, ZHA, deCONZ, forum SHADOW, Gmail, Johan.
 *
 * NEVER invents pid. NEVER auto-applies productId_default alone.
 *
 * Usage:
 *   node tools/ci/market-couples-intake.js
 *   node tools/ci/market-couples-intake.js --crawl
 *   node tools/ci/market-couples-intake.js --check
 *   node tools/ci/market-couples-intake.js --apply   # safe compose apply after intake
 *   node tools/ci/market-couples-intake.js --json
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveMarketDriver } = require('./market-driver-infer');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'market-couples');
const SSOT = path.join(ROOT, 'config', 'enrichment', 'market-couples-sources.json');

const DO_CRAWL = process.argv.includes('--crawl');
const CHECK = process.argv.includes('--check');
const DO_APPLY = process.argv.includes('--apply');
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

function enrichCouple(c) {
  const resolved = resolveMarketDriver(c.mfr, c.pid);
  const src = c.sources || [];
  const catalogHit = src.some((s) => ['blakadder', 'z2m', 'zha', 'deconz'].includes(s));
  const blakadderHit = src.includes('blakadder');
  const z2mHit = src.includes('z2m');
  return {
    ...c,
    routeHint: resolved.driver,
    tier: resolved.tier,
    applySafe: !!resolved.applySafe && !!resolved.driver,
    reason: resolved.reason,
    z2mDesc: resolved.z2m?.description || null,
    needsReview: !resolved.applySafe,
    catalogHit,
    blakadderHit,
    z2mHit,
  };
}

function sortMarketNew(a, b) {
  // apply-safe first, then multi-catalog, then blakadder
  if (a.applySafe !== b.applySafe) return a.applySafe ? -1 : 1;
  const aMulti = a.blakadderHit && a.z2mHit;
  const bMulti = b.blakadderHit && b.z2mHit;
  if (aMulti !== bMulti) return aMulti ? -1 : 1;
  if (a.blakadderHit !== b.blakadderHit) return a.blakadderHit ? -1 : 1;
  if (a.needsReview !== b.needsReview) return a.needsReview ? 1 : -1;
  return a.mfr.localeCompare(b.mfr) || a.pid.localeCompare(b.pid);
}

function renderMarkdown(report) {
  const lines = [
    '# Market couples intake — ' + report.generatedAt.slice(0, 10),
    '',
    'Sacred couple only (mfr+pid). Silent enrichment — no forum posts.',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| Total unique pairs | ${report.totalPairs} |`,
    `| Market-new (not in compose) | ${report.marketNew} |`,
    `| Apply-safe | ${report.applySafe} |`,
    `| Soft pid_default (review) | ${report.pidDefaultSoft} |`,
    `| Needs review | ${report.needsReview} |`,
    `| Blakadder new | ${report.blakadderNew} |`,
    '',
    '## Sources',
    '',
  ];
  for (const [k, v] of Object.entries(report.bySource || {})) {
    lines.push(`- **${k}**: ${v} pairs`);
  }

  const safe = (report.topMarketNew || []).filter((c) => c.applySafe);
  lines.push('', '## Apply-safe (registry / exact / Z2M description)', '');
  lines.push('| Couple | Sources | Driver | Tier | Z2M |');
  lines.push('|--------|---------|--------|------|-----|');
  for (const c of safe.slice(0, 40)) {
    lines.push(`| \`${c.mfr}+${c.pid}\` | ${c.sources.join(', ')} | ${c.routeHint} | ${c.tier} | ${(c.z2mDesc || '—').slice(0, 40)} |`);
  }

  const review = (report.topMarketNew || []).filter((c) => !c.applySafe);
  lines.push('', '## Needs review (not auto-applied)', '');
  lines.push('| Couple | Sources | Soft hint | Tier |');
  lines.push('|--------|---------|-----------|------|');
  for (const c of review.slice(0, 40)) {
    lines.push(`| \`${c.mfr}+${c.pid}\` | ${c.sources.join(', ')} | ${c.routeHint || '—'} | ${c.tier} |`);
  }

  lines.push('', 'Apply safe: `node tools/ci/apply-market-couples.js --apply`');
  lines.push('Regenerate: `npm run market:couples` · crawl: `npm run market:couples:crawl`');
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

  const enriched = (summary.marketNewList || []).map(enrichCouple).sort(sortMarketNew);

  const report = {
    generatedAt: new Date().toISOString(),
    mode: DO_CRAWL ? 'crawl+cross-ref' : 'cross-ref-only',
    totalPairs: summary.totalUniquePairs,
    marketNew: summary.marketNew,
    blakadderNew: enriched.filter((c) => c.blakadderHit).length,
    catalogNew: enriched.filter((c) => c.catalogHit).length,
    applySafe: enriched.filter((c) => c.applySafe).length,
    pidDefaultSoft: enriched.filter((c) => c.tier === 'pid_default').length,
    bySource: summary.bySource,
    withRouteHint: enriched.filter((c) => c.routeHint).length,
    needsReview: enriched.filter((c) => c.needsReview).length,
    topMarketNew: enriched.slice(0, 150),
    crawlResults,
    crossRef: { ok: xref.ok, tail: xref.tail },
  };

  fs.writeFileSync(path.join(STATE_DIR, 'intake.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(STATE_DIR, 'NEED_REVIEW.md'), renderMarkdown(report));

  log(`market-new: ${report.marketNew} | apply-safe: ${report.applySafe} | pid_default soft: ${report.pidDefaultSoft} | review: ${report.needsReview}`);
  log(`Wrote ${path.relative(ROOT, path.join(STATE_DIR, 'intake.json'))}`);

  if (DO_APPLY) {
    log('Applying apply-safe couples…');
    const ar = runNode('tools/ci/apply-market-couples.js', ['--apply'], 120000);
    log(ar.ok ? 'apply OK' : `apply warn: ${ar.tail.slice(0, 200)}`);
    report.apply = { ok: ar.ok, tail: ar.tail };
  }

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

module.exports = { main, enrichCouple, sortMarketNew, renderMarkdown };
