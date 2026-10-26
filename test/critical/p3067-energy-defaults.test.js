'use strict';
// P3067 energy (user t577u/t580u/t582u): default-power table as LAST resort, precedence
// measured > calculated (V×I×PF, Σ phases) > user > couple > driver rule > class; meter math
// (integration with gap clamp, counter reset/rollover); bounded 10-bucket self-calibration
// (idea: Home Assistant powercalc LUT, reimplemented), persisted at most daily.
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const R = require(path.join(ROOT, 'lib/energy/PowerSourceResolver'));
const Cal = require(path.join(ROOT, 'lib/energy/PowerSelfCalibration'));
const table = require(path.join(ROOT, 'data/energy/default-power.json'));

describe('P3067 default-power table', () => {
  it('every entry is labelled with a reason, values are the requested approximations', () => {
    for (const [k, v] of Object.entries(table.classes)) {assert.ok(v.why, `class ${k} lacks why`);}
    for (const r of table.driverRules) {assert.ok(r.why && r.match);}
    assert.strictEqual(table.classes.light.onW, 8);
    assert.strictEqual(table.classes.light.standbyW, 0.3);
    assert.strictEqual(table.classes.socket.onW, 40);
    assert.strictEqual(table.classes.heater.onW, 1000);
    assert.strictEqual(table.classes.sensor.onW, null);
  });
  it('driver rules: strip 12 W, dimmer 40 W, unmetered plug 0.5 W, IR 1 W, TRV no estimate', () => {
    assert.strictEqual(R.defaultFor({ driverId: 'led_strip_rgbw', deviceClass: 'light' }).onW, 12);
    assert.strictEqual(R.defaultFor({ driverId: 'dimmer_1_gang', deviceClass: 'light' }).onW, 40);
    assert.strictEqual(R.defaultFor({ driverId: 'plug', deviceClass: 'socket' }).standbyW, 0.5);
    assert.strictEqual(R.defaultFor({ driverId: 'ir_blaster', deviceClass: 'other' }).onW, 1);
    assert.strictEqual(R.defaultFor({ driverId: 'device_radiator_valve', deviceClass: 'thermostat' }).onW, null);
    assert.strictEqual(R.defaultFor({ driverId: 'bulb_rgb', deviceClass: 'light' }).source, 'class_default');
  });
});

describe('P3067 power precedence', () => {
  const id = { driverId: 'bulb_dimmable', deviceClass: 'light' };
  it('measured wins over everything', () => {
    assert.deepStrictEqual(R.resolve({ measuredW: 5.5, volts: 230, amps: 1, userRatedW: 60, identity: id }), { watts: 5.5, source: 'measured' });
  });
  it('calculated V×I×PF, then Σ phases', () => {
    assert.strictEqual(R.resolve({ volts: 230, amps: 0.5, pf: 0.9, identity: id }).watts, 103.5);
    assert.strictEqual(R.resolve({ volts: 230, amps: 0.5, pf: 0.9 }).source, 'calculated');
    assert.strictEqual(R.resolve({ phaseW: [100, null, 50.5] }).watts, 150.5);
  });
  it('user rated power beats defaults and scales with dim; default labelled', () => {
    assert.deepStrictEqual(R.resolve({ userRatedW: 60, identity: id, state: { on: true, dim: 0.5 } }), { watts: 30.15, source: 'user' });
    const d = R.resolve({ identity: id, state: { on: true, dim: 1 } });
    assert.strictEqual(d.watts, 8); assert.strictEqual(d.source, 'default'); assert.ok(d.why);
    assert.strictEqual(R.resolve({ identity: id, state: { on: false } }).watts, 0.3);
  });
  it('curtain draws only while moving; battery sensor has no estimate', () => {
    const c = { deviceClass: 'windowcoverings', driverId: 'curtain_motor' };
    assert.strictEqual(R.resolve({ identity: c, state: { on: true, moving: false } }).watts, 0.3);
    assert.strictEqual(R.resolve({ identity: c, state: { on: true, moving: true } }).watts, 30);
    assert.deepStrictEqual(R.resolve({ identity: { deviceClass: 'sensor', driverId: 'motion' }, state: { on: true } }), { watts: null, source: 'none' });
  });
});

describe('P3067 meter math', () => {
  it('integrates W to kWh and refuses gaps (offline / restart)', () => {
    assert.strictEqual(R.integrateKwh(0, 1000, 1000, 3600 * 1000, 2 * 3600 * 1000), 1);
    assert.strictEqual(R.integrateKwh(2, 1000, 1000, 3 * 3600 * 1000), 2);
  });
  it('counter reset and rollover stay monotonic', () => {
    let s = R.monotonicCounter(10, {});
    s = R.monotonicCounter(12, s);
    s = R.monotonicCounter(0.5, s); // reset
    assert.strictEqual(s.total, 12.5);
    let w = R.monotonicCounter(99990, {}, 100000);
    w = R.monotonicCounter(5, w, 100000); // wrap
    assert.strictEqual(w.total, 100005);
  });
});

describe('P3067 self-calibration (bounded)', () => {
  it('learns per-dim buckets and standby, interpolates, constant size', () => {
    const c = new Cal();
    for (let i = 0; i < 4; i++) { c.learn({ on: true, dim: 1, watts: 9 }); c.learn({ on: true, dim: 0.15, watts: 2 }); c.learn({ on: false, watts: 0.4 }); }
    assert.strictEqual(c.estimate({ on: true, dim: 0.95 }), 9);
    const mid = c.estimate({ on: true, dim: 0.55 });
    assert.ok(mid > 2 && mid < 9);
    assert.strictEqual(c.estimate({ on: false }), 0.4);
    assert.strictEqual(c.estimate({ on: true, dim: 0.05 }), null);
    for (let i = 0; i < 5000; i++) {c.learn({ on: true, dim: Math.random(), watts: 5 });}
    assert.strictEqual(c.toCompact().length, 23);
    assert.strictEqual(c.learn({ on: true, dim: 1, watts: 1e6 }), false);
  });
  it('persists at most once a day and round-trips', () => {
    const c = new Cal();
    c.learn({ on: true, dim: 1, watts: 9 });
    const t = 1e12;
    const a = c.persistIfDue(t);
    assert.ok(Array.isArray(a));
    c.learn({ on: true, dim: 1, watts: 9 });
    assert.strictEqual(c.persistIfDue(t + 3600e3), null);
    assert.ok(Array.isArray(c.persistIfDue(t + Cal.PERSIST_MS)));
    assert.deepStrictEqual(new Cal(a).toCompact(), a);
  });
  it('accrue: stops while unavailable, clamps gaps and absurd watts', () => {
    let s = Cal.accrue(null, { watts: 1000, now: 0 });
    s = Cal.accrue(s, { watts: 1000, now: 3600e3, maxGapMs: 2 * 3600e3 });
    assert.strictEqual(s.kwh, 1);
    s = Cal.accrue(s, { watts: 1000, now: 7200e3, available: false });
    s = Cal.accrue(s, { watts: 1000, now: 9000e3 });
    assert.strictEqual(s.kwh, 1);
    s = Cal.accrue(s, { watts: 1e9, now: 9000e3 + 3600e3, maxGapMs: 2 * 3600e3 });
    assert.ok(s.kwh <= 1 + 4.0001);
  });
});

describe('P3067 estimator wiring (DeviceTelemetryEstimator)', () => {
  const DTE = require(path.join(ROOT, 'lib/utils/DeviceTelemetryEstimator'));
  function fake({ caps = {}, settings = {}, store = {}, driverId = 'bulb_dimmable', cls = 'light', available = true } = {}) {
    const values = { ...caps };
    return {
      values, store, settings,
      driver: { id: driverId },
      getClass: () => cls,
      getName: () => 'x',
      getAvailable: () => available,
      hasCapability: (c) => Object.prototype.hasOwnProperty.call(values, c),
      getCapabilityValue: (c) => values[c],
      getSetting: (k) => settings[k],
      setSettings: async (o) => { Object.assign(settings, o); },
      getStoreValue: (k) => store[k],
      setStoreValue: async (k, v) => { store[k] = v; },
    };
  }
  it('class default from the new table (light 8 W / 0.3 W) and source label', async () => {
    const e = new DTE(fake({ caps: { onoff: true } }));
    assert.strictEqual(e._defaultPowerWatts(), 8);
    assert.strictEqual(e._defaultStandbyWatts(), 0.3);
  });
  it('V×I×PF beats the default and is labelled calculated', () => {
    const e = new DTE(fake({ caps: { onoff: true, measure_voltage: 230, measure_current: 0.5, measure_power_factor: 90 }, driverId: 'switch_1gang', cls: 'socket' }));
    assert.strictEqual(e._estimatePower(), 103.5);
    assert.strictEqual(e._powerSource, 'calculated');
  });
  it('learned bucket table is used once trusted (no user rated power)', () => {
    const d = fake({ caps: { onoff: true, dim: 1 } });
    const e = new DTE(d);
    for (let i = 0; i < 3; i++) {e._learnCurve(7.2, 1e12 + i);}
    assert.strictEqual(e._estimatePower(), 7.2);
    assert.strictEqual(e._powerSource, 'learned');
    d.settings.nominal_power = 60;
    e._estimatePower();
    assert.strictEqual(e._powerSource, 'user');
  });
  it('no energy accrues while the device is unavailable; gaps are capped', () => {
    const off = new DTE(fake({ caps: { onoff: true }, available: false }));
    assert.strictEqual(off._estimateEnergy(100, 3600e3, Date.now()), 0);
    const on = new DTE(fake({ caps: { onoff: true } }));
    assert.strictEqual(on._estimateEnergy(1000, 48 * 3600e3, Date.now()), 2);
  });
  it('publishes the read-only energy_source label only when the driver declares it', async () => {
    const d = fake({ caps: { onoff: true }, settings: { energy_source: 'default' } });
    const e = new DTE(d); e._powerSource = 'learned';
    await e._publishPowerSource();
    assert.strictEqual(d.settings.energy_source, 'learned');
    const d2 = fake({ caps: { onoff: true } });
    const e2 = new DTE(d2); e2._powerSource = 'user';
    await e2._publishPowerSource();
    assert.strictEqual(d2.settings.energy_source, undefined);
    assert.strictEqual(d2.store.telemetry_power_source, 'user');
  });
});
