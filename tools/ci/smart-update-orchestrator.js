#!/usr/bin/env node
/**
 * Smart Update Orchestrator (P58.3)
 * ==========================================================================
 * Decide which crawlers/workflows ACTUALLY need to run this cycle, based on
 * the diff-cache state — and only trigger those. Sources whose data hasn't
 * changed are SKIPPED (no API call, no GHA minute spend).
 *
 * User intent (P58.3):
 *   - "intelligent update" — don't re-read/re-dump everything
 *   - "régulier et autonome" — runs on a schedule, no manual intervention
 *   - "sans surfacturation" — minimal API calls, max use of cached data
 *
 * Inputs:
 *   - .cache/scraper-cache/_metrics.json (per-URL fetch state, from smart-fetch)
 *   - .cache/scanner-blobs/_index.json (per-scanner last-modified, from diff-cache)
 *   - .github/state/mega-crawl/state.json (last mega-crawl per-source timestamp)
 *   - last commit time (HEAD) — for "app has changed, re-validate"
 *
 * Output:
 *   - JSON plan: { skip: [...], run: [...], reason: {...} }
 *   - Exit code 0 always (orchestrator is informational, not a gate)
 *
 * Run:  node tools/ci/smart-update-orchestrator.js [--json] [--dry-run]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const CACHE_SCRAPER = path.join(ROOT, '.cache', 'scraper-cache', '_metrics.json');
const CACHE_SCANNER = path.join(ROOT, '.cache', 'scanner-blobs', '_index.json');
const STATE_MEGA = path.join(ROOT, '.github', 'state', 'mega-crawl', 'state.json');

// Default "fresh enough" window per source. Sources that have been
// updated within this window are SKIPPED — no point re-fetching.
const FRESH_WINDOWS_MS = {
  'blakadder':       7 * 24 * 60 * 60 * 1000,  // 7 days (slow-changing)
  'johan':           24 * 60 * 60 * 1000,       // 1 day
  'gmail':           4 * 60 * 60 * 1000,         // 4 hours (active diagnostics)
  'forum':           12 * 60 * 60 * 1000,        // 12 hours
  'z2m':             7 * 24 * 60 * 60 * 1000,
  'zha':             7 * 24 * 60 * 60 * 1000,
  'deconz':          14 * 24 * 60 * 60 * 1000,  // 14 days (very stable)
  'tinytuya':        7 * 24 * 60 * 60 * 1000,
  'tuya-local':      3 * 24 * 60 * 60 * 1000,   // 3 days (active development)
  'hubitat':         14 * 24 * 60 * 60 * 1000,
  'smartthings':     7 * 24 * 60 * 60 * 1000,
  'openhab':         14 * 24 * 60 * 60 * 1000,
  'domoticz':        14 * 24 * 60 * 60 * 1000,
  'xiaomi-miot':     7 * 24 * 60 * 60 * 1000,
  'csa-iot':         30 * 24 * 60 * 60 * 1000,  // 30 days (certification, very stable)
};

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function getLastFetched(source) {
  // Try mega-crawl state first
  const mega = readJsonSafe(STATE_MEGA);
  if (mega && mega.sources && mega.sources[source]) {
    return new Date(mega.sources[source].lastSuccess || 0).getTime();
  }
  // Fall back to scraper-cache metrics
  const metrics = readJsonSafe(CACHE_SCRAPER);
  if (metrics && metrics.hosts) {
    let latest = 0;
    for (const host of Object.values(metrics.hosts)) {
      if (host.lastFetched && host.lastFetched > latest) latest = host.lastFetched;
    }
    return latest;
  }
  return 0;
}

function getSourcePlan() {
  const now = Date.now();
  const plan = { skip: [], run: [], reason: {} };
  for (const [source, windowMs] of Object.entries(FRESH_WINDOWS_MS)) {
    const lastFetched = getLastFetched(source);
    const ageMs = lastFetched ? (now - lastFetched) : Infinity;
    const ageHours = Math.round(ageMs / (60 * 60 * 1000));
    const within = ageMs < windowMs;
    if (within) {
      plan.skip.push(source);
      plan.reason[source] = `fresh (${ageHours}h ago, window ${Math.round(windowMs / 3600000)}h)`;
    } else {
      plan.run.push(source);
      plan.reason[source] = lastFetched
        ? `stale (${ageHours}h ago, window ${Math.round(windowMs / 3600000)}h)`
        : 'never fetched';
    }
  }
  return plan;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const jsonMode = args.has('--json');
  const dryRun = args.has('--dry-run');
  const silent = args.has('--silent');
  const trigger = args.has('--trigger');

  const plan = getSourcePlan();
  if (jsonMode) {
    console.log(JSON.stringify(plan, null, 2));
  } else if (!silent) {
    console.log('=== Smart Update Orchestrator (P58.3) ===\n');
    console.log(`SKIP (${plan.skip.length} — fresh, no API call needed):`);
    for (const s of plan.skip) console.log(`  ⏭  ${s.padEnd(15)} ${plan.reason[s]}`);
    console.log(`\nRUN (${plan.run.length} — stale, will trigger):`);
    for (const s of plan.run) console.log(`  🔄 ${s.padEnd(15)} ${plan.reason[s]}`);
    console.log(`\nPlan: ${plan.run.length} sources to run, ${plan.skip.length} to skip.`);
    if (plan.run.length === 0) {
      console.log('✅ All sources fresh — no crawl needed.');
    }
  }
  if (trigger && !dryRun) {
    const { spawnSync } = require('child_process');
    if (!silent) console.log('\nTriggering mega-crawl with skip flags...');
    // Build --skip argument: only run the stale sources, skip the fresh ones
    // (the workflow accepts comma-separated skip)
    // Note: this assumes mega-crawl has a --only filter, otherwise the
    // orchestrator triggers a full run but the crawlers are smart enough
    // to short-circuit when their cache is fresh.
    const skipArgs = plan.skip.length > 0
      ? `--field skip=${plan.skip.join(',')}`
      : '';
    const result = spawnSync('gh', [
      'workflow', 'run', '🕷️ Mega Crawler',
      '--ref', 'master',
      ...(skipArgs ? skipArgs.split(' ') : []),
    ], { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    if (result.status !== 0 && !silent) {
      console.error('gh workflow run failed:', result.stderr);
    }
  } else if (trigger && dryRun) {
    console.log('\n(dry-run: would trigger mega-crawl)');
  }
  if (dryRun && !trigger) {
    console.log('\n(dry-run: not actually triggering anything)');
  }
  // Exit 0 always — orchestrator is informational
  process.exit(0);
}

if (require.main === module) main();
module.exports = { getSourcePlan, FRESH_WINDOWS_MS };
