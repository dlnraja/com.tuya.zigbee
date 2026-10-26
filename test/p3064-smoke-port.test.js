'use strict';
/* eslint-env mocha */
// P3064 family uplift: late optional capabilities, receive-only DP listener, TS0601 smoke/CO,
// TOQCB2-80 breaker temperature. Sources: zigbee-herdsman-converters tuya.ts (facts only).
const assert = require('assert');
const Module = require('module');
const { EventEmitter } = require('events');

function load(rel) {
  const orig = Module._load;
  Module._load = function (r, ...a) {
    if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
    return orig.call(this, r, ...a);
  };
  try { const p = require.resolve(rel); delete require.cache[p]; return require(p); } finally { Module._load = orig; }
}
const LateCapability = require('../lib/helpers/LateCapability');
const PassiveDpRx = require('../lib/tuya/PassiveDpRx');
const tick = () => new Promise((r) => setImmediate(r));

function fakeDev(caps = []) {
  const have = new Set(caps); const vals = {}; let adds = 0;
  return {
    hasCapability: (c) => have.has(c),
    addCapability: async (c) => { adds++; have.add(c); },
    safeSetCapabilityValue: async (c, v) => { vals[c] = v; },
    log: () => {}, error: () => {},
    get adds() { return adds; }, vals, have,
  };
}

describe('P3064 LateCapability', () => {
  it('adds once after a real value, then writes', async () => {
    const d = fakeDev();
    assert.strictEqual(await LateCapability.ensureAndSet(d, 'measure_temperature', 21.5), true);
    assert.strictEqual(await LateCapability.ensureAndSet(d, 'measure_temperature', 22), true);
    assert.strictEqual(d.adds, 1);
    assert.strictEqual(d.vals.measure_temperature, 22);
  });
  it('never adds for null / NaN and swallows add failures (one attempt)', async () => {
    const d = fakeDev();
    assert.strictEqual(await LateCapability.ensureAndSet(d, 'alarm_co', null), false);
    assert.strictEqual(await LateCapability.ensureAndSet(d, 'measure_power', NaN), false);
    d.addCapability = async () => { throw new Error('nope'); };
    assert.strictEqual(await LateCapability.ensureAndSet(d, 'alarm_co', true), false);
    let called = 0; d.addCapability = async () => { called++; };
    assert.strictEqual(await LateCapability.ensureAndSet(d, 'alarm_co', true), false);
    assert.strictEqual(called, 0);
  });
});

describe('P3064 PassiveDpRx', () => {
  it('uses the EF00 manager when present', () => {
    const mgr = new EventEmitter(); const got = [];
    const d = { tuyaEF00Manager: mgr };
    assert.strictEqual(PassiveDpRx.attach(d, (dp, v) => got.push([dp, v])), true);
    assert.strictEqual(PassiveDpRx.attach(d, () => {}), false); // idempotent
    mgr.emit('dpReport', { dpId: 18, value: 0 });
    assert.deepStrictEqual(got, [[18, 0]]);
  });
  it('falls back to the raw cluster and never sends anything', () => {
    const tc = new EventEmitter(); let sent = 0; tc.datapoint = () => { sent++; };
    const got = []; const d = { zclNode: { endpoints: { 1: { clusters: { tuya: tc } } } } };
    assert.strictEqual(PassiveDpRx.attach(d, (dp, v) => got.push([dp, v])), true);
    tc.emit('dataReport', { dp: 1, datatype: 4, data: Buffer.from([0]) });
    tc.emit('response', 0, 0, { dp: 15, datatype: 2, data: Buffer.from([0, 0, 0, 87]) });
    assert.deepStrictEqual(got, [[1, 0], [15, 87]]);
    assert.strictEqual(sent, 0);
  });
  it('no EF00 cluster -> no attach', () => {
    assert.strictEqual(PassiveDpRx.attach({ zclNode: { endpoints: { 1: { clusters: {} } } } }, () => {}), false);
  });
});

describe('P3064 smoke_sensor TS0601 couples', () => {
  const S = load('../drivers/smoke_sensor/device');
  it('exact couples only', () => {
    assert.strictEqual(S.smokeProfileFor('_TZE284_6ycgarab'), 'smoke_co');
    assert.strictEqual(S.smokeProfileFor('_TZE284_aoah6bv8'), 'smoke_co');
    assert.strictEqual(S.smokeProfileFor('_TZE200_6ycgarab'), null); // no upstream source
    assert.strictEqual(S.smokeProfileFor('_TZ3210_09hzmirw'), null);
  });
  it('maps smoke / CO / battery / tamper per Z2M converters', () => {
    assert.deepStrictEqual(S.mapSmokeDp('smoke_co', 1, 0), ['alarm_smoke', true]);
    assert.deepStrictEqual(S.mapSmokeDp('smoke_co', 1, 1), ['alarm_smoke', false]);
    assert.deepStrictEqual(S.mapSmokeDp('smoke_co', 18, 0), ['alarm_co', true]);
    assert.deepStrictEqual(S.mapSmokeDp('smoke_co', 18, 1), ['alarm_co', false]);
    assert.deepStrictEqual(S.mapSmokeDp('smoke_co', 15, 80), ['measure_battery', 80]);
    assert.strictEqual(S.mapSmokeDp('pa44z', 18, 0), null);
    assert.deepStrictEqual(S.mapSmokeDp('gsks', 4, 1), ['alarm_tamper', true]);
    assert.strictEqual(S.mapSmokeDp(null, 1, 0), null);
    assert.strictEqual(S.mapSmokeDp('smoke_co', 15, 250), null);
  });
  it('alarm_co is added late, alarm_smoke written directly', async () => {
    const d = Object.assign(Object.create(S.prototype), fakeDev(['alarm_smoke', 'measure_battery']));
    d._ts0601Smoke = 'smoke_co';
    d._onSmokeDp(1, 0); d._onSmokeDp(18, 0);
    await tick(); await tick();
    assert.strictEqual(d.vals.alarm_smoke, true);
    assert.strictEqual(d.vals.alarm_co, true);
    assert.ok(d.have.has('alarm_co'));
  });
});

