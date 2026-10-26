'use strict';
// P3068: log-only JSON.stringify in Tuya cluster / DP / frame handlers -> boundedJson (capped, never throws,
// Buffers as short hex). Only the log text of very large / Buffer payloads changes; parsing is untouched.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { scanSource } = require('../../scripts/ci/memory-hazard-ratchet.js');
const { boundedJson } = require('../../lib/utils/boundedJson');

const FILES = ['lib/clusters/TuyaBoundCluster.js', 'lib/clusters/TuyaE001BoundCluster.js', 'lib/clusters/TuyaE002BoundCluster.js',
  'lib/tuya/TuyaClusterWrapper.js', 'lib/tuya/TuyaDataPointEngine.js', 'lib/tuya/TuyaEF00Parser.js',
  'lib/tuya/TuyaUnifiedParser.js', 'lib/tuya/UniversalDPReceiver.js'];

test('P3068 hot handlers in Tuya clusters / DP parsers log bounded JSON', () => {
  for (const f of FILES) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) { continue; }
    const src = fs.readFileSync(p, 'utf8');
    assert.ok(/boundedJson\(/.test(src), `${f} should use boundedJson`);
    const hits = scanSource(src).hits['hot-stringify'];
    const allowed = f.endsWith('UniversalDPReceiver.js') || f.endsWith('TuyaDataPointEngine.js') ? 1 : 0; // dedup key / one-off setup dump
    assert.ok(hits.length <= allowed, `${f} still has untruncated hot JSON.stringify: ${hits}`);
  }
});

test('P3068 boundedJson keeps flood payloads small and never throws', () => {
  const frame = { dp: 1, datatype: 0, data: Buffer.alloc(4096, 0xab) };
  assert.ok(boundedJson(frame).length < 300);
  assert.ok(boundedJson({ big: 'x'.repeat(10000) }, 1000).length < 1100);
  const cyc = {}; cyc.self = cyc;
  assert.doesNotThrow(() => boundedJson(cyc));
  assert.strictEqual(boundedJson({ dp: 1, value: 25 }), JSON.stringify({ dp: 1, value: 25 }), 'small payloads log exactly as before');
});

test('P3068 memory-hazard baseline lowered for hot-stringify', () => {
  const b = JSON.parse(fs.readFileSync(path.join(ROOT, '.github', 'memory-hazard-baseline.json'), 'utf8'));
  for (const f of FILES) { assert.ok(!((b.files[f] || {})['hot-stringify'] > 1), `${f} baseline not lowered`); }
});
