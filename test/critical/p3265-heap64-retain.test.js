'use strict';

/**
 * P3265 — retained heap under a 64MB old-space cap.
 * The Athom trace is Mark-Compact 62.1→62.1 and 62.3→61.9 with an empty JS
 * stack. That is a live set, not proof of one giant JSON value. This test
 * builds a retained pad near that floor, then compares keeping the full
 * fingerprint catalog with keeping one shard. Desktop Node only.
 */

const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const CHILD = `
const fs = require('fs');
const path = require('path');
const mode = process.env.HEAP_MODE;
const pad = [];
const target = 62.5 * 1024 * 1024;
while (process.memoryUsage().heapUsed < target) {
  pad.push('x'.repeat(400000));
}
if (typeof global.gc === 'function') global.gc();
const baseline = process.memoryUsage().heapUsed;
let peak = baseline;
function sample() { peak = Math.max(peak, process.memoryUsage().heapUsed); }
if (mode === 'full') {
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib/tuya/fingerprints.json')));
  sample();
  global.keep = data;
} else if (mode === 'shard') {
  const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'lib/tuya/fp-shards/TZ3000_v.json')));
  sample();
  global.keep = data;
} else {
  throw new Error('mode');
}
if (typeof global.gc === 'function') global.gc();
const after = process.memoryUsage().heapUsed;
sample();
const keys = global.keep && typeof global.keep === 'object' ? Object.keys(global.keep).length : 0;
process.stdout.write(JSON.stringify({
  mode, baseline, after, peak, keys,
  delta: after - baseline,
}));
`;

function run(mode) {
  const r = spawnSync(process.execPath, ['--max-old-space-size=66', '--expose-gc', '-e', CHILD], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
    env: { ...process.env, HEAP_MODE: mode },
  });
  return r;
}

test('with ~62MB already retained, one shard adds far less heap than the full catalog', () => {
  const shard = run('shard');
  const full = run('full');
  assert.strictEqual(shard.status, 0, shard.stderr || shard.stdout);
  const shardJson = JSON.parse(shard.stdout);
  assert.ok(shardJson.keys > 0 && shardJson.keys < 200, JSON.stringify(shardJson));
  process.stdout.write(`\n# heap64 shard ${JSON.stringify(shardJson)}\n`);
  process.stdout.write(`# heap64 full status=${full.status} ${full.stdout.slice(0, 240)}\n`);
  assert.ok(shardJson.baseline > 60 * 1024 * 1024);
  if (full.status !== 0) {
    assert.match(`${full.stderr}\n${full.stdout}`, /heap|allocation failed|FATAL ERROR/i);
    return;
  }
  const fullJson = JSON.parse(full.stdout);
  assert.ok(fullJson.keys > 5000);
  assert.ok(shardJson.delta * 5 < fullJson.delta, JSON.stringify({ shard: shardJson, full: fullJson }));
  assert.ok((shardJson.peak - shardJson.baseline) * 5 < (fullJson.peak - fullJson.baseline));
});
