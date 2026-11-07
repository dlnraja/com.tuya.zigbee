'use strict';

/**
 * P3269: lazy fingerprint shards bucket by prefix. _TYST11_sgabhwa6 must
 * still resolve to soil_sensor after other shards have been loaded while
 * the heap is already past the 40MB pressure line. That case returned null
 * on the unpatched module (real heap, not the isMemoryPressure stand-in).
 * This is a lookup fix. It is not the startup OOM root cause.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { describe, it, after } = require('./_support/dual-runner');

if (process.env.P3269_HEAP === '1') {
  const pad = [];
  for (let i = 0; i < 24; i += 1) {
    const row = new Array(256 * 1024);
    for (let j = 0; j < row.length; j += 1) {row[j] = (i * 1000003) + j;}
    pad.push(row);
  }
  global.__p3269Pad = pad;
  const db = require('../lib/tuya/DeviceFingerprintDB');
  const dir = path.join(__dirname, '../lib/tuya/fp-shards');
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json') || name === 'manifest.json') {continue;}
    const data = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    const key = Object.keys(data)[0];
    if (key) {db.getFingerprint(key);}
  }
  const fp = db.getFingerprint('_TYST11_sgabhwa6', 'TS0601');
  process.stdout.write(JSON.stringify({
    heap: process.memoryUsage().heapUsed,
    driverId: fp && fp.driverId,
  }));
  process.exit(0);
}

function freshDb({ pressure = false } = {}) {
  const lazy = require('../lib/performance/IntelligentLazyLoad');
  if (!lazy.__p3269RealPressure) {lazy.__p3269RealPressure = lazy.isMemoryPressure;}
  lazy.isMemoryPressure = pressure ? () => true : lazy.__p3269RealPressure;
  const dbPath = path.resolve(__dirname, '../lib/tuya/DeviceFingerprintDB.js');
  const matcherPath = path.resolve(__dirname, '../lib/utils/fingerprint-matcher.js');
  delete require.cache[dbPath];
  delete require.cache[matcherPath];
  return require(dbPath);
}

describe('P3269 prefix-variant lookup across lazy shards', function() {
  after(function() {
    const lazy = require('../lib/performance/IntelligentLazyLoad');
    if (lazy.__p3269RealPressure) {lazy.isMemoryPressure = lazy.__p3269RealPressure; delete lazy.__p3269RealPressure;}
  });

  it('after odd-form lookups like p3015: _TYST11_ alias still resolves to the _TZE284_ entry', function() {
    const db = freshDb({ pressure: true });
    for (const id of ['_TZ3000_cjfmu5he', '_TZ3000_mq4wujmp', '_TZ3000_5af5r192', '_TZ3000_ogjpfoyn', '_TZ3000_kz1anoi8']) {
      for (const v of [id, id.toLowerCase(), id.toUpperCase(), `  ${id} `, `${id}\u0000`, `\uFEFF${id}`, `${id}\u200B`, `_\u200D${id.slice(1)}`]) {
        db.getFingerprint(v, 'TS0049');
      }
    }
    assert.strictEqual(db.getDriverId('_TYST11_sgabhwa6', 'TS0601'), 'soil_sensor');
  });

  it('under heap pressure: unknown suffix still returns null', function() {
    const db = freshDb({ pressure: true });
    assert.strictEqual(db.getFingerprint('_TYST11_zzzzzzzz', 'TS0601'), null);
  });

  it('cold DB: _TYST11_ alias resolves to soil_sensor', function() {
    const db = freshDb();
    assert.strictEqual(db.getDriverId('_TYST11_sgabhwa6', 'TS0601'), 'soil_sensor');
  });

  it('cold DB: unknown suffix still returns null', function() {
    const db = freshDb();
    assert.strictEqual(db.getFingerprint('_TYST11_zzzzzzzz', 'TS0601'), null);
  });

  it('warm DB: a later shard is visible to the prefix heuristic', function() {
    const db = freshDb();
    db.getFingerprint('_TZE200_zzzzzzzz', 'TS0601');
    const fp = db.getFingerprint('_TYST11_sgabhwa6', 'TS0601');
    assert.ok(fp);
    assert.strictEqual(fp.driverId, 'soil_sensor');
  });

  it('real heap above 40MB: evicted shards still resolve _TYST11_ to soil_sensor', function() {
    this.timeout(60000);
    const r = spawnSync(process.execPath, [__filename], {
      env: { ...process.env, P3269_HEAP: '1' },
      encoding: 'utf8',
      timeout: 60000,
    });
    assert.strictEqual(r.status, 0, r.stderr || r.stdout);
    const out = JSON.parse(r.stdout);
    assert.ok(out.heap > 40 * 1024 * 1024, `heap ${out.heap}`);
    assert.strictEqual(out.driverId, 'soil_sensor');
  });
});
