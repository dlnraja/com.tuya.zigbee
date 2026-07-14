#!/usr/bin/env node
/**
 * mega-crawler.js — P53
 *
 * Orchestrates ALL external data source crawlers in sequence.
 * Each crawler is independent: failure of one does not stop the others.
 * Aggregates results into a single mega-crawl report.
 *
 * Sources covered (12 internal + 4 external references):
 *   1.  zigbee.blakadder.com     (devices)        — already integrated
 *   2.  JohanBendz issues        (user reports)   — johan-dump
 *   3.  Gmail diagnostics        (crash logs)     — fetch-gmail-diags
 *   4.  community.homey.app      (forum)          — forum-integration
 *   5.  Koenkk/zigbee2mqtt       (converters)     — sync-z2m-mappings
 *   6.  zigpy/zha-device-handlers (quirks)        — (covered by external-sources)
 *   7.  deconz-rest-plugin       (Tuya FPs)       — crawl-deconz
 *   8.  jasonacox/tinytuya        (DP types)       — tinytuya-scanner
 *   9.  make-all/tuya-local       (YAML configs)  — tuya-local-scanner
 *  10.  Hubitat                   (Groovy)        — hubitat-scanner
 *  11.  SmartThings               (Edge FPs)      — smartthings-scanner
 *  12.  openHAB                   (XML)           — openhab-scanner
 *  13.  Domoticz                  (Lua)           — domoticz-scanner
 *  14.  xiaomi-miot               (specs)         — xiaomi-miot-scanner
 *  15.  CSA-IoT                   (certification) — csa-iot-scanner
 *
 * Run:
 *   node tools/ci/mega-crawler.js                  # all
 *   node tools/ci/mega-crawler.js --only=blakadder  # one
 *   node tools/ci/mega-crawler.js --skip=gmail      # exclude
 *
 * Output:
 *   .github/state/mega-crawl/state.json
 *   .github/state/mega-crawl/report.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state', 'mega-crawl');

const args = process.argv.slice(2);
const only = (() => { const a = args.find(x => x.startsWith('--only=')); return a ? a.split('=')[1] : null; })();
const skip = (() => { const a = args.find(x => x.startsWith('--skip=')); return a ? a.split('=')[1].split(',') : []; })();
const TIMEOUT_MS = (() => { const a = args.find(x => x.startsWith('--timeout=')); return a ? parseInt(a.split('=')[1]) * 1000 : 900000; })();
const PARALLEL = args.includes('--parallel');

// Define crawlers
const CRAWLERS = [
  {
    id: 'blakadder',
    name: 'zigbee.blakadder.com',
    cmd: 'node scripts/sync/crawl-blakadder.js',
    weight: 'high',
    estimated: '30s',
    desc: 'Crawl Blakadder 2692-device DB → 635 Tuya FPs',
  },
  {
    id: 'johan',
    name: 'JohanBendz/com.tuya.zigbee (issues + comments + PRs)',
    cmd: 'node tools/ci/johan-dump.js --no-auth 2>&1 || node tools/ci/johan-dump.js',
    weight: 'high',
    estimated: '60s',
    desc: 'Dump Johan issues + comments + PRs (READ-ONLY)',
  },
  {
    id: 'gmail',
    name: 'Gmail diagnostics',
    cmd: 'node tools/ci/gmail-diagnostics.js --max 100 2>&1 || echo "GMAIL_SKIP_AUTH"',
    weight: 'high',
    estimated: '60s',
    desc: 'Fetch Gmail crash logs / diagnostics (requires GMAIL_APP_PASSWORD)',
  },
  {
    id: 'forum',
    name: 'community.homey.app forum',
    cmd: 'node tools/ci/forum-integration.js 2>&1 || echo "FORUM_SKIP"',
    weight: 'medium',
    estimated: '45s',
    desc: 'Crawl Homey community forum topic 140352 + related',
  },
  {
    id: 'z2m',
    name: 'Zigbee2MQTT converters',
    cmd: 'node scripts/sync/crawl-z2m.js 2>&1 || echo "Z2M_SKIP"',
    weight: 'high',
    estimated: '30s',
    desc: 'Crawl Z2M Tuya converter source',
  },
  {
    id: 'zha',
    name: 'ZHA device handlers',
    cmd: 'node scripts/sync/crawl-zha.js 2>&1 || echo "ZHA_SKIP"',
    weight: 'high',
    estimated: '30s',
    desc: 'Crawl ZHA quirks DB',
  },
  {
    id: 'deconz',
    name: 'deCONZ device DB',
    cmd: 'node scripts/sync/crawl-deconz.js 2>&1 || echo "DECONZ_SKIP"',
    weight: 'medium',
    estimated: '30s',
    desc: 'Crawl deCONZ Tuya fingerprints',
  },
  // Scanners (lightweight, usually cached)
  { id: 'tinytuya', name: 'TinyTuya DP types', cmd: 'node scripts/scanners/tinytuya-scanner.js 2>&1 || echo "SKIP"', weight: 'low', estimated: '20s' },
  { id: 'tuya-local', name: 'Tuya-Local YAML', cmd: 'node scripts/scanners/tuya-local-scanner.js 2>&1 || echo "SKIP"', weight: 'low', estimated: '20s' },
  { id: 'hubitat', name: 'Hubitat Groovy', cmd: 'node scripts/scanners/hubitat-scanner.js 2>&1 || echo "SKIP"', weight: 'low', estimated: '20s' },
  { id: 'smartthings', name: 'SmartThings Edge FPs', cmd: 'node scripts/scanners/smartthings-scanner.js 2>&1 || echo "SKIP"', weight: 'low', estimated: '20s' },
  { id: 'openhab', name: 'openHAB XML', cmd: 'node scripts/scanners/openhab-scanner.js 2>&1 || echo "SKIP"', weight: 'low', estimated: '20s' },
  { id: 'domoticz', name: 'Domoticz Lua', cmd: 'node scripts/scanners/domoticz-scanner.js 2>&1 || echo "SKIP"', weight: 'low', estimated: '20s' },
  { id: 'xiaomi-miot', name: 'Xiaomi MIoT', cmd: 'node scripts/scanners/xiaomi-miot-scanner.js 2>&1 || echo "SKIP"', weight: 'low', estimated: '20s' },
  { id: 'csa-iot', name: 'CSA-IoT certification', cmd: 'node scripts/scanners/csa-iot-scanner.js 2>&1 || echo "SKIP"', weight: 'low', estimated: '20s' },
];

function filterCrawlers() {
  let list = CRAWLERS;
  if (only) list = list.filter(c => c.id === only);
  if (skip.length) list = list.filter(c => !skip.includes(c.id));
  return list;
}

function runOne(c) {
  const start = Date.now();
  try {
    // P55 — bumped maxBuffer to 50MB to handle verbose scanners (tuya-local
    // with 200+ YAMLs in parallel was hitting ENOBUFS at default 1MB)
    const out = execSync(c.cmd, { cwd: ROOT, encoding: 'utf8', timeout: TIMEOUT_MS, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 50 * 1024 * 1024 });
    const dur = Date.now() - start;
    return { id: c.id, status: 'ok', durationMs: dur, outputLines: out.split('\n').length };
  } catch (e) {
    const dur = Date.now() - start;
    const msg = (e.stdout || '') + (e.stderr || e.message || '');
    const isSkip = /SKIP|GMAIL_SKIP|FORUM_SKIP|Z2M_SKIP|ZHA_SKIP|DECONZ_SKIP/.test(msg);
    return { id: c.id, status: isSkip ? 'skipped' : 'failed', durationMs: dur, error: (e.message || '').substring(0, 300), isSkip };
  }
}

async function runParallel(list, parallelism) {
  const results = new Array(list.length);
  let nextIdx = 0;
  async function worker() {
    while (nextIdx < list.length) {
      const i = nextIdx++;
      const c = list[i];
      process.stdout.write('  [' + c.id + '] running...');
      const r = runOne(c);
      if (r.status === 'ok') console.log(' OK (' + r.durationMs + 'ms, ' + r.outputLines + ' lines)');
      else if (r.status === 'skipped') console.log(' SKIPPED (' + r.durationMs + 'ms)');
      else console.log(' FAILED (' + r.durationMs + 'ms): ' + r.error);
      results[i] = r;
    }
  }
  const workers = Array.from({ length: Math.min(parallelism, list.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log('=== Mega Crawler (P53) ===');
  fs.mkdirSync(STATE_DIR, { recursive: true });

  const list = filterCrawlers();
  console.log('Crawlers to run:', list.length);
  for (const c of list) console.log('  -', c.id, '·', c.name);

  // P53: parallel mode (default 4 workers). Use --sequential for old behavior.
  const parallel = !args.includes('--sequential');
  const parallelism = (() => {
    const a = args.find(x => x.startsWith('--parallel='));
    return a ? parseInt(a.split('=')[1]) : 4;
  })();
  if (parallel) console.log('Mode: PARALLEL (workers=' + parallelism + ')');
  else console.log('Mode: SEQUENTIAL');

  const t0 = Date.now();
  const results = parallel
    ? await runParallel(list, parallelism)
    : list.map(c => runOne(c));
  const totalMs = Date.now() - t0;

  const ok = results.filter(r => r.status === 'ok').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed = results.filter(r => r.status === 'failed').length;

  const report = {
    meta: { generatedAt: new Date().toISOString(), totalDurationMs: totalMs, parallel, parallelism, timeoutMs: TIMEOUT_MS },
    summary: { total: results.length, ok, skipped, failed },
    results,
  };
  fs.writeFileSync(path.join(STATE_DIR, 'report.json'), JSON.stringify(report, null, 2));
  const state = { lastRun: new Date().toISOString(), total: results.length, ok, skipped, failed, durationMs: totalMs };
  fs.writeFileSync(path.join(STATE_DIR, 'state.json'), JSON.stringify(state, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log('Total    :', results.length);
  console.log('OK       :', ok);
  console.log('Skipped  :', skipped);
  console.log('Failed   :', failed);
  console.log('Duration :', (totalMs / 1000).toFixed(1) + 's');
  console.log('Report   :', path.join(STATE_DIR, 'report.json'));
  if (failed > 0) {
    console.log('\n=== FAILED ===');
    for (const r of results.filter(x => x.status === 'failed')) {
      console.log('  ' + r.id + ': ' + r.error);
    }
    process.exit(1);
  }
}

main().catch(e => { console.error('FATAL:', e.stack || e.message); process.exit(1); });
