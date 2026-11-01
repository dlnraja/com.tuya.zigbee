'use strict';

// P3198: every diag must carry mfr/pid/driver/clusters/DPs per device, anonymised.
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const DDS = require('../../lib/diagnostics/DeviceDiagSnapshot');

function fakeIeee() { return Array.from({ length: 8 }, (_, i) => ((i * 37 + 11) % 256).toString(16).padStart(2, '0')).join(':'); }
function fakeName() { return ['Dev', 'Label', String(Date.now() % 97)].join(' '); }

function makeDevice(lines) {
  const ieee = fakeIeee();
  const name = fakeName();
  const cls = (id) => { const C = function () {}; C.ID = id; return new C(); };
  const dev = {
    driver: { id: 'power_meter' },
    getName: () => name,
    getData: () => ({ ieeeAddress: ieee }),
    getSetting: (k) => ({ zb_manufacturer_name: '_TZE204_abcdefgh', zb_model_id: 'TS0601', zb_app_version: 74 })[k],
    getAvailable: () => true,
    getCapabilities: () => ['measure_power', 'meter_power'],
    zclNode: { endpoints: { 1: { clusters: { basic: cls(0), tuya: cls(0xef00) }, bindings: { ota: cls(0x19) } } } },
    log: (...a) => lines.push(a.join(' ')),
    error: (...a) => lines.push(`ERR ${a.join(' ')}`),
    homey: { app: { log: (...a) => lines.push(a.join(' ')) } },
  };
  return { dev, ieee, name };
}

describe('P3198 DeviceDiagSnapshot', () => {
  it('logs identity, clusters, DPs, unmapped DPs and errors without IEEE or name', () => {
    const lines = [];
    const { dev, ieee, name } = makeDevice(lines);
    DDS.recordDp(dev, 1, 2, 1234, true);
    DDS.dumpDevice(dev, 'test', 1); // wraps error()
    dev.error(`bind failed for ${name} at ${ieee}`);
    DDS.recordDp(dev, 16, 0, Buffer.alloc(8), false);
    const line = DDS.buildLine(dev, 1, 'test');
    assert.ok(/mfr=_TZE204_abcdefgh/.test(line) && /pid=TS0601/.test(line) && /drv=power_meter/.test(line), line);
    assert.ok(/fw=app:74/.test(line), line);
    assert.ok(/ep=1:in\[0000,ef00\]out\[0019\]/.test(line), line);
    assert.ok(/1:2\/num@/.test(line) && /16:0\/buf8@\S*!/.test(line) && /unmapped=16/.test(line), line);
    assert.ok(/err=.*bind failed for \[NAME\] at \[IEEE\]/.test(line), line);
    assert.ok(/\[IEEE-1\]/.test(line));
    for (const l of [line, ...lines.filter((x) => !x.startsWith('ERR'))]) {
      assert.ok(!l.includes(ieee) && !l.includes(name), l);
    }
  });

  it('stays bounded and never throws on garbage', () => {
    const lines = [];
    const { dev } = makeDevice(lines);
    for (let i = 0; i < 500; i += 1) {DDS.recordDp(dev, i, 2, i, true);}
    assert.strictEqual(DDS._state.get(dev).dps.size, DDS.MAX_DPS);
    for (let i = 0; i < 20; i += 1) {DDS.recordError(dev, `e${i}`);}
    assert.strictEqual(DDS._state.get(dev).errs.length, DDS.MAX_ERRS);
    assert.doesNotThrow(() => { DDS.recordDp(null, 1); DDS.recordDp({}, 'x'); DDS.buildLine({}, 2); DDS.dumpAll(null); DDS.dumpDevice(undefined); });
    assert.ok(DDS.buildLine({ getName() { throw new Error('x'); } }, 3).startsWith('[DIAG-DEV] #3'));
  });

  it('dumpAll staggers and respects the re-dump window', () => {
    const lines = []; const timers = [];
    const a = makeDevice(lines).dev; const b = makeDevice(lines).dev;
    const app = { log: (m) => lines.push(m), homey: { setTimeout: (fn, ms) => timers.push([fn, ms]), drivers: { getDrivers: () => ({ x: { getDevices: () => [a, b] } }) } } };
    a.homey.app = app; b.homey.app = app;
    assert.strictEqual(DDS.dumpAll(app, { force: true }), 2);
    assert.ok(timers[1][1] > timers[0][1]);
    timers.forEach(([fn]) => fn());
    assert.strictEqual(lines.filter((l) => l.startsWith('[DIAG-DEV] #')).length, 2);
    assert.strictEqual(DDS.dumpAll(app, {}), 0, 'periodic skips recently dumped devices');
  });

  it('keeps a bounded raw frame ring, unmapped frames first, plus unknown ZCL commands', () => {
    const lines = [];
    const { dev, ieee } = makeDevice(lines);
    DDS.recordDp(dev, 101, 0, null, false, Buffer.from('a1b2c3', 'hex'));
    for (let i = 0; i < 40; i += 1) {DDS.recordDp(dev, 1, 2, i, true, Buffer.from([0, 0, 0, i]));}
    DDS.recordDp(dev, 102, 0, null, false, Buffer.alloc(64, 0xab));
    const st = DDS._state.get(dev);
    assert.ok(st.frames.length <= DDS.MAX_FRAMES);
    assert.ok(st.frames.some((f) => f.dp === 101), 'unmapped frame survives eviction');
    dev._unknownIncoming = { ring: [{ ep: 1, cluster: '0xE001', cmd: 7, hex: '0102' }] };
    const line = DDS.buildLine(dev, 2, 'test');
    assert.ok(/raw=dp10[12]\/t0\/l\d+:/.test(line), line);
    assert.ok(/dp101\/t0\/l3:a1b2c3!/.test(line), line);
    assert.ok(/dp102\/t0\/l64:(ab){24}~!/.test(line), 'long payload truncated');
    assert.ok(/zcl_unk=1\/0xE001\/c7:0102/.test(line), line);
    assert.ok(!line.includes(ieee));
  });
});
