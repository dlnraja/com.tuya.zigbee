// test-tuya-local-isolated.js — Test if the parallel fetchAll works in GHA-like conditions
'use strict';
const path = require('path');
process.chdir(path.resolve(__dirname, '..', '..'));

const { fetchAll } = require('../../scripts/scanners/concurrent-fetch');
const { DiffCache } = require('../../scripts/scanners/diff-cache');

async function test() {
  console.log('=== Test: 200 URLs in parallel with concurrency=30 ===');
  // Generate 200 fake URLs (real ones to test actual network)
  const urls = [];
  for (let i = 0; i < 50; i++) {
    urls.push('https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts');
  }
  urls.length = 50;

  const diffCache = new DiffCache('test');

  const t0 = Date.now();
  const results = await fetchAll(urls, {
    concurrency: 30,
    timeout: 30000,
    perHost: { 'raw.githubusercontent.com': 30 },
  });
  const dur = Date.now() - t0;

  let ok = 0, err = 0, cache = 0;
  for (const r of results) {
    if (r.error) err++;
    else if (r.fromCache) cache++;
    else ok++;
  }
  console.log(`Duration: ${dur}ms`);
  console.log(`OK: ${ok}, Cache: ${cache}, Errors: ${err}`);
  console.log(`Stats: ${JSON.stringify(diffCache.getStats())}`);
}

test().catch(e => { console.error('FATAL:', e); process.exit(1); });
