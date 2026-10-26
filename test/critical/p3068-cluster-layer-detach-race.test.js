'use strict';
// P3068: ClusterLayerAttach.detach() during a still-running attach() (device deleted/re-initialised
// while configureReporting is in flight) must not leave fallback pollers armed on homey.setInterval
// — those are app-level timers, the SDK never clears them, and they kept polling + retaining the
// deleted device (seen as timersLeft>0 in the P3065 lifecycle harness on master).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const CLA = require(path.resolve(__dirname, '..', '..', 'lib/zigbee/cluster/ClusterLayerAttach'));

function fixture() {
  let release;
  const gate = new Promise((r) => { release = r; });
  const armed = new Set();
  let calls = 0;
  const cluster = () => ({
    configureReporting: () => { calls++; return gate.then(() => { throw new Error('UNSUP_GENERAL_COMMAND'); }); },
    readAttributes: async () => ({}),
    on() {},
  });
  const device = {
    getCapabilities: () => ['measure_temperature', 'measure_humidity'],
    getSetting: () => undefined,
    log() {}, error() {},
    homey: {
      setInterval: (fn, ms) => { const t = { fn, ms }; armed.add(t); return t; },
      clearInterval: (t) => { armed.delete(t); },
      settings: { get: () => undefined },
    },
  };
  const zclNode = { endpoints: { 1: { clusters: { temperatureMeasurement: cluster(), relativeHumidity: cluster() } } } };
  return { device, zclNode, armed, release, calls: () => calls };
}

test('P3068 detach while configureReporting is pending leaves no poller armed', async () => {
  const f = fixture();
  const p = CLA.attach(f.device, f.zclNode);
  for (let i = 0; i < 50 && f.calls() === 0; i++) await new Promise((r) => setImmediate(r));
  assert.ok(f.calls() > 0, 'configureReporting was reached');
  CLA.detach(f.device);
  f.release();
  await p;
  assert.strictEqual(f.armed.size, 0, `pollers left armed after detach: ${f.armed.size}`);
});

test('P3068 without detach the bounded fallback poller is still armed (behaviour kept)', async () => {
  const f = fixture();
  const p = CLA.attach(f.device, f.zclNode);
  f.release();
  await p;
  assert.ok(f.armed.size >= 1 && f.armed.size <= 4, `armed=${f.armed.size}`);
  CLA.detach(f.device);
  assert.strictEqual(f.armed.size, 0);
});

test('P3068 a late attach() after delete (detach already ran) arms nothing', async () => {
  const f = fixture();
  f.device._destroyed = true; // onDeleted/onUninit set this first, then detach() cleared _p2935
  CLA.detach(f.device);
  f.release();
  const st = await CLA.attach(f.device, f.zclNode);
  assert.strictEqual(st, null);
  assert.strictEqual(f.armed.size, 0);
});

test('P3068 device destroyed while configureReporting is pending (no detach call) arms nothing', async () => {
  const f = fixture();
  const p = CLA.attach(f.device, f.zclNode);
  for (let i = 0; i < 50 && f.calls() === 0; i++) await new Promise((r) => setImmediate(r));
  f.device._destroyed = true;
  f.release();
  await p;
  assert.strictEqual(f.armed.size, 0, `pollers armed for a destroyed device: ${f.armed.size}`);
});
