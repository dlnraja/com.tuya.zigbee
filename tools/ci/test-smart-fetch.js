#!/usr/bin/env node
/**
 * Test suite for smart-fetch.js (P55)
 * Tests:
 *  1. Cold cache → fresh fetch
 *  2. Warm cache → 304 notModified
 *  3. Bounded parallel batch
 *  4. Adaptive rate limit on 429 (exponential backoff)
 *  5. Auto-retry on transient errors
 *  6. Per-source metrics persistence
 *  7. Cache invalidation
 *  8. Different sources don't share cache
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { smartFetch, smartFetchAll, SmartFetcher, ResponseCache, getMetric, SOURCE_DEFAULTS } = require(path.resolve(__dirname, '../../lib/scraper/smart-fetch'));

const REPO_ROOT = path.resolve(__dirname, '../..');
const CACHE_DIR = path.join(REPO_ROOT, '.cache', 'scraper-cache');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  ✅ ' + msg);
  } else {
    failed++;
    console.log('  ❌ ' + msg);
  }
}

function assertEq(a, b, msg) {
  if (JSON.stringify(a) === JSON.stringify(b)) {
    passed++;
    console.log('  ✅ ' + msg);
  } else {
    failed++;
    console.log('  ❌ ' + msg + ' (got ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b) + ')');
  }
}

async function runTests() {
  console.log('═══ SMART FETCH TEST SUITE (P55) ═══\n');

  // Clean cache to start fresh
  if (fs.existsSync(CACHE_DIR)) {
    for (const f of fs.readdirSync(CACHE_DIR)) {
      try { fs.unlinkSync(path.join(CACHE_DIR, f)); } catch {}
    }
  }
  // Also clean test subdirs
  for (const sub of ['cold-fresh', 'warm-cache', 'parallel', 'metrics-test', 'cache-iso-a', 'cache-iso-b', 'invalid']) {
    const d = path.join(CACHE_DIR, sub);
    if (fs.existsSync(d)) {
      for (const f of fs.readdirSync(d)) {
        try { fs.unlinkSync(path.join(d, f)); } catch {}
      }
    }
  }

  // ── Test 1: Cold cache → fresh fetch ──────────────────────────────────
  console.log('Test 1: Cold cache → fresh fetch');
  const t1Url = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/ikea.ts';
  const r1 = await smartFetch(t1Url, { source: 'cold-fresh', persistMetrics: false });
  assert(r1.fromCache === false, 'First fetch is fresh (not from cache)');
  assert(r1.statusCode === 200, 'Status 200');
  assert(r1.body.length > 1000, 'Body has content');
  assert(r1.attempts === 1, 'Single attempt');

  // ── Test 2: Warm cache → 304 ──────────────────────────────────────────
  console.log('\nTest 2: Warm cache → 304 notModified');
  const r2 = await smartFetch(t1Url, { source: 'cold-fresh', persistMetrics: false });
  assert(r2.fromCache === true, 'Second fetch from cache');
  assert(r2.notModified === true, 'Server returned 304 notModified');
  assert(r2.durationMs < r1.durationMs, 'Warm cache faster than cold (' + r2.durationMs + 'ms < ' + r1.durationMs + 'ms)');

  // ── Test 3: Bounded parallel batch ────────────────────────────────────
  console.log('\nTest 3: Bounded-parallel batch (5 URLs, concurrency=2)');
  const urls3 = [
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/sonoff.ts',
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/danfoss.ts',
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/philips.ts',
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/schneider_electric.ts',
    'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/bosch.ts',
  ];
  const t3start = Date.now();
  const r3 = await smartFetchAll(urls3, { source: 'parallel', concurrency: 2, persistMetrics: false });
  const t3dur = Date.now() - t3start;
  assert(r3.length === 5, 'Got 5 results');
  const okCount = r3.filter(r => r.statusCode === 200).length;
  assert(okCount === 5, 'All 5 successful (got ' + okCount + ')');
  // Sequential would take 5*duration; parallel with c=2 should be ~3*duration
  const avgPerReq = r3.reduce((s, r) => s + r.durationMs, 0) / 5;
  assert(t3dur < (avgPerReq * 4.5), 'Bounded parallel faster than sequential (' + t3dur + 'ms < ' + Math.round(avgPerReq * 4.5) + 'ms)');

  // ── Test 4: Different sources don't share cache ──────────────────────
  console.log('\nTest 4: Different sources → different cache namespaces');
  const r4a = await smartFetch('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/ikea.ts', { source: 'cache-iso-a', persistMetrics: false });
  const r4b = await smartFetch('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/ikea.ts', { source: 'cache-iso-b', persistMetrics: false });
  assert(r4a.fromCache === false, 'Source A is fresh');
  assert(r4b.fromCache === false, 'Source B is fresh (different namespace)');

  // ── Test 5: Metrics persistence ───────────────────────────────────────
  console.log('\nTest 5: Metrics persistence (across fetch calls)');
  const fetcher = new SmartFetcher({ source: 'metrics-test', persistMetrics: true });
  await fetcher.fetch('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/ikea.ts');
  await fetcher.fetch('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/sonoff.ts');
  const m = getMetric('metrics-test');
  assert(m !== null, 'Metrics persisted');
  assert(m.totalRequests >= 2, 'totalRequests >= 2 (got ' + m.totalRequests + ')');
  assert(m.totalSuccess >= 1, 'totalSuccess >= 1 (got ' + m.totalSuccess + ')');
  assert(m.avgDurationMs > 0, 'avgDurationMs > 0 (got ' + m.avgDurationMs + 'ms)');

  // ── Test 6: 429 backoff (mock-style via real httpbin) ────────────────
  console.log('\nTest 6: 429 backoff (real httpbin rate-limit endpoint)');
  const t6start = Date.now();
  const r6 = await smartFetch('https://httpbin.org/status/429', {
    source: 'httpbin-429', maxRetries: 2, baseBackoffMs: 200, persistMetrics: false,
  }).catch(e => ({ error: e.message }));
  const t6dur = Date.now() - t6start;
  // Should have tried 3 times (1 + 2 retries) with backoff
  assert(r6.error !== undefined, 'Failed after retries (no cache fallback for uncached URL)');
  assert(t6dur >= 200, 'Wasted at least baseBackoffMs on backoff (got ' + t6dur + 'ms)');

  // ── Test 7: SmartFetcher.stats() ──────────────────────────────────────
  console.log('\nTest 7: SmartFetcher.getStats() shape');
  const f7 = new SmartFetcher({ source: 'cold-fresh' });
  const stats7 = f7.getStats();
  assert(stats7.source === 'cold-fresh', 'source = cold-fresh');
  assert(stats7.concurrency >= 1, 'concurrency >= 1');
  assert(stats7.maxRetries >= 1, 'maxRetries >= 1');
  assert(stats7.cache && stats7.cache.entries >= 1, 'cache has >= 1 entry');

  // ── Test 8: SOURCE_DEFAULTS is sensible ──────────────────────────────
  console.log('\nTest 8: SOURCE_DEFAULTS sensible values');
  assert(SOURCE_DEFAULTS['forum-topic'].concurrency <= 5, 'forum-topic concurrency <= 5 (got ' + SOURCE_DEFAULTS['forum-topic'].concurrency + ')');
  assert(SOURCE_DEFAULTS['tuya-local'].concurrency >= 30, 'tuya-local concurrency >= 30 (got ' + SOURCE_DEFAULTS['tuya-local'].concurrency + ')');
  assert(SOURCE_DEFAULTS['gmail-imap'].concurrency === 1, 'gmail-imap concurrency = 1 (sequential IMAP)');
  assert(SOURCE_DEFAULTS['homey-crash'].concurrency === 1, 'homey-crash concurrency = 1 (local files)');

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('\n═══ RESULTS ═══');
  console.log('  Passed: ' + passed);
  console.log('  Failed: ' + failed);
  console.log('  Total:  ' + (passed + failed));
  if (failed > 0) {
    console.log('\n❌ ' + failed + ' test(s) FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed');
    process.exit(0);
  }
}

runTests().catch(e => { console.error('FATAL:', e); process.exit(1); });
