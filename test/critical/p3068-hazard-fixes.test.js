'use strict';
// P3068 step 2 — riskiest memory-hazard ratchet hits fixed for real (not re-baselined):
//  * TuyaEF00Manager frame/DP/report handlers logged JSON.stringify(frame|data|value) uncapped (Buffers ≈ 4 chars/byte,
//    some pretty-printed) on every incoming Tuya frame → now boundedJson() (≤240 chars, Buffers as short hex, never throws).
//  * SleepyDeviceInit fireAndForget timeout + deferredTuyaDataRequest used native setTimeout holding the device
//    → now device-owned via safe-timers (device.homey timer, cleared by Homey on uninit/delete).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const { boundedJson, DEFAULT_MAX } = require('../../lib/utils/boundedJson');
const ratchet = require('../../scripts/ci/memory-hazard-ratchet');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('boundedJson: caps size, Buffers as short hex, cycles/BigInt never throw', () => {
  const big = { dp: 2, data: Buffer.alloc(4096, 0xab), list: Array.from({ length: 2000 }, (_, i) => i) };
  const s = boundedJson(big);
  assert.ok(s.length <= DEFAULT_MAX + 16, `len ${s.length}`);
  assert.match(s, /<buf 4096B abab/);
  assert.strictEqual(boundedJson(Buffer.from([1, 2, 3])), '<buf 3B 010203>');
  const cyc = { a: 1 }; cyc.self = cyc;
  assert.match(boundedJson(cyc), /^\[unserializable: /);
  assert.strictEqual(boundedJson(10n), '"10"');
  assert.strictEqual(boundedJson({ dp: 1, value: true }), '{"dp":1,"value":true}');
  assert.strictEqual(boundedJson(undefined), 'undefined');
  assert.ok(boundedJson('x'.repeat(5000), 50).length < 70);
});

test('TuyaEF00Manager: no uncapped JSON.stringify in this._log lines, ratchet hot-stringify = 0', () => {
  const src = read('lib/tuya/TuyaEF00Manager.js');
  assert.match(src, /require\('\.\.\/utils\/boundedJson'\)/);
  const bad = src.split('\n').filter((l) => /this\._log\(/.test(l) && /JSON\.stringify\(/.test(l));
  assert.deepStrictEqual(bad, []);
  assert.deepStrictEqual(ratchet.scanSource(src).hits['hot-stringify'], []);
});

function fakeDevice() {
  const armed = new Map(); let id = 0; const cleared = [];
  const homey = {
    setTimeout: (fn, ms) => { id += 1; armed.set(id, { fn, ms }); return id; },
    clearTimeout: (t) => { cleared.push(t); armed.delete(t); },
  };
  return { homey, armed, cleared, logs: [], log(...a) { this.logs.push(a.join(' ')); } };
}

test('SleepyDeviceInit: deferredTuyaDataRequest arms a device-owned timer, skips destroyed devices', () => {
  const { deferredTuyaDataRequest } = require('../../lib/utils/SleepyDeviceInit');
  const asked = [];
  const zclNode = { endpoints: { 1: { clusters: { tuya: { dataRequest: (a) => { asked.push(a.dp); return Promise.resolve(); } } } } } };
  const dev = fakeDevice();
  deferredTuyaDataRequest(dev, zclNode, [4, 15], 5000);
  assert.strictEqual(dev.armed.size, 1, 'timer must be armed on device.homey');
  const [t] = dev.armed.values();
  assert.strictEqual(t.ms, 5000);
  t.fn();
  assert.deepStrictEqual(asked, [4, 15]);
  const dead = fakeDevice();
  deferredTuyaDataRequest(dead, zclNode, [4], 10);
  dead._destroyed = true;
  [...dead.armed.values()][0].fn();
  assert.deepStrictEqual(asked, [4, 15], 'destroyed device must not be queried');
});

test('SleepyDeviceInit: fireAndForget timeout is device-owned and cleared on settle', async () => {
  const { fireAndForget } = require('../../lib/utils/SleepyDeviceInit');
  const dev = fakeDevice();
  const v = await fireAndForget(dev, Promise.resolve(42), { name: 'x', timeoutMs: 1000 });
  assert.strictEqual(v, 42);
  assert.strictEqual(dev.cleared.length, 1);
  assert.strictEqual(dev.armed.size, 0);
  const src = read('lib/utils/SleepyDeviceInit.js');
  assert.deepStrictEqual(ratchet.scanSource(src).hits['raw-timer'], []);
});

test('memory-hazard baseline lowered for the fixed files (never raised)', () => {
  const base = JSON.parse(read('.github/memory-hazard-baseline.json'));
  const f = base.files || {};
  assert.ok(!(f['lib/tuya/TuyaEF00Manager.js'] || {})['hot-stringify'], 'EF00 hot-stringify must be 0 in baseline');
  assert.ok(!(f['lib/utils/SleepyDeviceInit.js'] || {})['raw-timer'], 'SleepyDeviceInit raw-timer must be 0 in baseline');
});
