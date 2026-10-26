'use strict';
// P3075 (t613u, Bastien OOM 17-18/10): per-frame DP / raw-frame / ZCL report logs in the relay and sensor
// bases used full JSON.stringify (one big string per incoming frame). They now go through boundedJson
// (capped, never throws, Buffers as short hex). Log text only; parsing and dedup keys are untouched.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { scanSource } = require('../../scripts/ci/memory-hazard-ratchet.js');
const { boundedJson, DEFAULT_MAX } = require('../../lib/utils/boundedJson');

const CLEAN = ['lib/devices/UnifiedSwitchBase.js', 'lib/devices/TuyaUnifiedDevice.js', 'lib/mixins/TuyaDeviceMixin.js',
  'lib/devices/BaseTuyaDPDevice.js', 'lib/dynamic/AutoAdaptiveDevice.js'];

test('P3075 relay/DP frame logs are bounded (no hot JSON.stringify left in the per-frame handlers)', () => {
  for (const f of CLEAN.filter((x) => fs.existsSync(path.join(ROOT, x)))) {
    const hits = scanSource(fs.readFileSync(path.join(ROOT, f), 'utf8')).hits['hot-stringify'];
    assert.deepStrictEqual(hits, [], f);
  }
  const base = fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8');
  assert.ok(/\[TUYA-DP\] Received:', boundedJson\(data\)|dp-log-sampler/.test(base)); // master samples instead
  const huge = { dp: 1, data: 'x'.repeat(100000), buf: Buffer.alloc(5000) };
  assert.ok(boundedJson(huge).length <= DEFAULT_MAX + 32);
});
