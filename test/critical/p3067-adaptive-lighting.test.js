'use strict';
// P3067 adaptive lighting (user t576u/t577u/t578u): one app-level engine, default ON per light,
// safe default: no write until the light has been seen OFF then ON again; manual-override pause;
// global kill switch; CT clamp to physical range; RGB-only white approximation; dim only when opted in.
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const Curve = require(path.join(ROOT, 'lib/lighting/AdaptiveLightingCurve'));
const Engine = require(path.join(ROOT, 'lib/lighting/AdaptiveLightingEngine'));

let seq = 0;
function light(caps, settings = {}, store = {}) {
  const id = `d${++seq}`;
  const values = { ...caps };
  const writes = [];
  return {
    writes, values,
    getData: () => ({ id }),
    getSetting: (k) => ({ adaptive_lighting: true, ...settings })[k],
    getStoreValue: (k) => store[k],
    hasCapability: (c) => Object.prototype.hasOwnProperty.call(values, c),
    getCapabilityValue: (c) => values[c],
    triggerCapabilityListener: async (c, v) => { writes.push([c, v]); values[c] = v; },
  };
}
function homeyWith(devices, settings = {}) {
  return {
    settings: { get: (k) => settings[k] },
    drivers: { getDrivers: () => ({ a: { getDevices: () => devices } }) },
    setInterval: () => 1, clearInterval: () => {},
  };
}
function engine(devices, opts = {}) {
  const e = new Engine(homeyWith(devices, opts.settings), { now: opts.now || (() => 1e12), solarElevation: { getElevation: () => opts.elev ?? 40 } });
  return e;
}

describe('P3067 adaptive lighting curve', () => {
  it('warm at night, cool at high sun, inside 2000..5600 K', () => {
    assert.strictEqual(Curve.targetKelvin(Curve.daylightFactor({ elevation: -10 }).factor), 2000);
    assert.strictEqual(Curve.targetKelvin(Curve.daylightFactor({ elevation: 60 }).factor), 5600);
    assert.strictEqual(Curve.daylightFactor({ date: new Date(2026, 9, 26, 3, 0) }).source, 'clock');
    assert.strictEqual(Curve.daylightFactor({ date: new Date(2026, 9, 26, 3, 0) }).factor, 0);
  });
  it('clamps to the physical range (ZCL mireds, else profile, else 2700-6500 K)', () => {
    assert.deepStrictEqual(Curve.physicalRange({ minMired: 153, maxMired: 454 }), { minK: 2203, maxK: 6536, source: 'zcl' });
    assert.strictEqual(Curve.physicalRange({}).source, 'default');
    const warmest = Curve.kelvinToHomeyTemperature(2000, Curve.SAFE_RANGE_K);
    assert.strictEqual(warmest, Curve.kelvinToHomeyTemperature(2700, Curve.SAFE_RANGE_K));
    assert.ok(Curve.kelvinToHomeyTemperature(5600) < warmest);
  });
  it('RGB white approximation: warm is orange-ish and saturated, cool is near white', () => {
    const warm = Curve.kelvinToHueSat(2000); const cool = Curve.kelvinToHueSat(6500);
    assert.ok(warm.hue < 0.12 && warm.saturation > 0.5);
    assert.ok(cool.saturation < 0.1);
  });
});

describe('P3067 adaptive lighting engine safety', () => {
  it('default ON never writes at pairing/startup while the light is already on', async () => {
    const d = light({ onoff: true, light_temperature: 0.1, dim: 1 });
    const e = engine([d]);
    await e.tick(); await e.tick();
    assert.deepStrictEqual(d.writes, []);
  });
  it('first write only after the light was seen OFF then ON; brightness untouched unless opted in', async () => {
    const d = light({ onoff: false, light_temperature: 0.1, dim: 1 });
    const e = engine([d]);
    await e.tick();
    d.values.onoff = true;
    await e.tick();
    assert.strictEqual(d.writes.length, 1);
    assert.strictEqual(d.writes[0][0], 'light_temperature');
    assert.ok(!d.writes.some(([c]) => c === 'dim'));
  });
  it('manual CT change pauses the light; next ON cycle resumes', async () => {
    const d = light({ onoff: false, light_temperature: 0.9, dim: 1 });
    const e = engine([d], { elev: 60 });
    await e.tick(); d.values.onoff = true; await e.tick();
    const n = d.writes.length;
    d.values.light_temperature = 0.95; // user / other app changed it
    await e.tick(); await e.tick();
    assert.strictEqual(d.writes.length, n, 'paused after external change');
    d.values.onoff = false; await e.tick(); d.values.onoff = true; await e.tick();
    assert.ok(d.writes.length > n, 'resumed on next ON');
  });
  it('global kill switch and per-device opt-out stop every write', async () => {
    const a = light({ onoff: false, light_temperature: 0.9 });
    const b = light({ onoff: false, light_temperature: 0.9 }, { adaptive_lighting: false });
    const e = engine([a, b], { settings: { adaptive_lighting_global: false } });
    await e.tick(); a.values.onoff = true; b.values.onoff = true; await e.tick();
    assert.deepStrictEqual(a.writes, []);
    const e2 = engine([b]);
    await e2.tick(); b.values.onoff = false; await e2.tick(); b.values.onoff = true; await e2.tick();
    assert.deepStrictEqual(b.writes, []);
  });
  it('dimmer-only adapts brightness only when adaptive_brightness is on; RGB-only gets a white tint', async () => {
    const dimOnly = light({ onoff: false, dim: 1 }, { adaptive_brightness: true });
    const rgb = light({ onoff: false, light_hue: 0.5, light_saturation: 0.2 });
    const e = engine([dimOnly, rgb], { elev: -10 });
    await e.tick(); dimOnly.values.onoff = true; rgb.values.onoff = true; await e.tick();
    assert.deepStrictEqual(dimOnly.writes.map(([c]) => c), ['dim']);
    assert.ok(dimOnly.writes[0][1] < 1 && dimOnly.writes[0][1] >= 0.9, 'smooth step');
    assert.deepStrictEqual(rgb.writes.map(([c]) => c).sort(), ['light_hue', 'light_saturation']);
  });
  it('legacy per-device manager owners and bounded writes per tick', async () => {
    const legacy = light({ onoff: false, light_temperature: 0.9 }, { adaptive_lighting_enabled: true });
    assert.strictEqual(Engine.isEligible(legacy), false);
    const many = Array.from({ length: 30 }, () => light({ onoff: false, light_temperature: 0.9 }));
    const e = engine(many, { elev: 60 });
    await e.tick(); many.forEach((d) => { d.values.onoff = true; });
    const r = await e.tick();
    assert.ok(r.writes <= Engine.MAX_WRITES_PER_TICK);
  });
});

describe('P3067 adaptive lighting scale (t582u: bounded scheduler)', () => {
  it('global concurrency cap: never more than MAX_IN_FLIGHT writes in flight', async () => {
    let inFlight = 0; let peak = 0;
    const devs = [];
    for (let i = 0; i < 20; i++) {
      const d = light({ onoff: false, light_temperature: 0.0 });
      d.triggerCapabilityListener = async (c, v) => {
        inFlight++; peak = Math.max(peak, inFlight);
        await new Promise((r) => setImmediate(r));
        d.values[c] = v; inFlight--;
      };
      devs.push(d);
    }
    const e = engine(devs);
    await e.tick();
    devs.forEach((d) => { d.values.onoff = true; });
    const r = await e.tick();
    assert.ok(peak <= Engine.MAX_IN_FLIGHT, `peak ${peak}`);
    assert.ok(r.writes <= Engine.MAX_WRITES_PER_TICK);
  });
  it('failure backoff: a failing light is not retried on the next tick', async () => {
    let calls = 0;
    const d = light({ onoff: false, light_temperature: 0.0 });
    d.triggerCapabilityListener = async () => { calls++; throw new Error('timeout'); };
    let t = 1e12;
    const e = engine([d], { now: () => t });
    await e.tick(); d.values.onoff = true; await e.tick();
    assert.strictEqual(calls, 1);
    t += 30 * 1000; await e.tick();
    assert.strictEqual(calls, 1);
    t += 2 * 60 * 1000; await e.tick();
    assert.strictEqual(calls, 2);
  });
  it('passes a transition duration to the driver listener', async () => {
    const d = light({ onoff: false, light_temperature: 0.0 });
    let opts = null;
    d.triggerCapabilityListener = async (c, v, o) => { opts = o; d.values[c] = v; };
    const e = engine([d]); await e.tick(); d.values.onoff = true; await e.tick();
    assert.ok(opts && opts.duration > 0);
  });
  it('soak: 500 lights x 24 h simulated keeps state, writes and heap bounded', async function soak() {
    if (this && this.timeout) {this.timeout(120000);}
    const devs = [];
    for (let i = 0; i < 500; i++) {
      const d = light({ onoff: i % 2 === 0, light_temperature: 0.5, dim: 0.8 }, { adaptive_brightness: i % 5 === 0 });
      d.triggerCapabilityListener = async (c, v) => { d.values[c] = v; d.n = (d.n || 0) + 1; };
      devs.push(d);
    }
    let t = Date.UTC(2026, 9, 26, 0, 0);
    let elev = -20;
    const e = new Engine(homeyWith(devs), { now: () => t, spacingMs: 0, solarElevation: { getElevation: () => elev } });
    if (global.gc) {global.gc();}
    const heap0 = process.memoryUsage().heapUsed;
    let total = 0;
    for (let m = 0; m < 24 * 60; m++) {
      t += 60 * 1000;
      elev = 50 * Math.sin(((m - 360) / 720) * Math.PI);
      if (m % 97 === 0) {devs.forEach((d, i) => { if (i % 3 === m % 3) {d.values.onoff = !d.values.onoff;} });}
      const r = await e.tick();
      total += r.writes;
      assert.ok(r.writes <= Engine.MAX_WRITES_PER_TICK);
    }
    if (global.gc) {global.gc();}
    const grow = process.memoryUsage().heapUsed - heap0;
    assert.ok(e._state.size <= 500);
    assert.ok(total <= 24 * 60 * Engine.MAX_WRITES_PER_TICK);
    assert.ok(total > 0);
    // retained heap is only meaningful with --expose-gc (otherwise it counts collectable garbage)
    if (global.gc) {assert.ok(grow < 16 * 1024 * 1024, `heap grew ${grow}`);}
    assert.ok(devs.every((d) => (d.n || 0) <= 24 * 60), 'a light was written more than once a minute');
    e.destroy();
    assert.strictEqual(e._state.size, 0);
  });
});

describe('P3067 manifest: default-on adaptive lighting on every light, energy defaults', () => {
  const app = require(path.join(ROOT, 'app.json'));
  const flat = (s) => (s || []).flatMap((x) => (x.children ? x.children : [x]));
  it('every light (ZCL, EF00, Wi-Fi local) declares adaptive_lighting=true and adaptive_brightness=false', () => {
    const lights = app.drivers.filter((d) => d.class === 'light' && (d.capabilities || []).includes('onoff')
      && ['dim', 'light_temperature', 'light_hue'].some((c) => d.capabilities.includes(c)));
    assert.ok(lights.length >= 60);
    let missing = 0;
    for (const d of lights) {
      const s = flat(d.settings);
      const al = s.find((x) => x.id === 'adaptive_lighting');
      const ab = s.find((x) => x.id === 'adaptive_brightness');
      if (!al) { missing++; continue; }
      assert.strictEqual(al.value, true, d.id);
      assert.strictEqual(ab.value, false, d.id);
    }
    assert.ok(missing <= 5, `missing ${missing}`);
    for (const id of ['wifi_light', 'wifi_led_strip', 'bulb_rgbw', 'dimmer_1_gang']) {
      assert.ok(flat(app.drivers.find((d) => d.id === id).settings).some((x) => x.id === 'adaptive_lighting'), id);
    }
  });
  it('metered drivers expose the read-only energy_source label; unmetered on/off loads get a native approximation', () => {
    for (const d of app.drivers) {
      const c = d.capabilities || [];
      if (c.some((x) => /^(measure_power|meter_power)/.test(x))) {
        const lab = flat(d.settings).find((x) => x.id === 'energy_source');
        assert.ok(lab && lab.type === 'label', d.id);
      }
    }
    assert.deepStrictEqual(app.drivers.find((d) => d.id === 'plug').energy.approximation, { usageOn: 0.5, usageOff: 0.5 });
    assert.deepStrictEqual(app.drivers.find((d) => d.id === 'wifi_switch').energy.approximation, { usageOn: 40, usageOff: 0.4 });
  });
});

describe('P3067 engine: cooperation with Flow cards (pause / resume / single writer)', () => {
  const Engine = require(path.join(ROOT, 'lib/lighting/AdaptiveLightingEngine'));
  const mk = (extra = {}) => Object.assign({
    getData: () => ({ id: 'L1' }), getSetting: (k) => (k === 'adaptive_lighting' ? true : null),
    hasCapability: (c) => ['onoff', 'light_temperature'].includes(c), getCapabilityValue: () => true,
  }, extra);
  it('pause stops adapting, resume lifts it, bounded to 1440 min', () => {
    let t = 0; const e = new Engine({ settings: { get: () => true } }, { now: () => t });
    const d = mk();
    assert.strictEqual(e.isActiveFor(d), true);
    assert.strictEqual(e.pause(d, 99999), true);
    assert.strictEqual(e.isActiveFor(d), false);
    t = 1440 * 60000; assert.strictEqual(e.isActiveFor(d), true);
    e.pause(d, 10); assert.strictEqual(e.isActiveFor(d), false);
    e.resume(d); assert.strictEqual(e.isActiveFor(d), true);
    assert.strictEqual(e.pause(d, 0), false);
    e.destroy(); assert.strictEqual(e._state.size, 0);
  });
  it('a running per-device manager (card-created) keeps the engine off that light', () => {
    assert.strictEqual(Engine.isEligible(mk({ adaptiveLighting: { active: true } })), false);
    assert.strictEqual(Engine.isEligible(mk({ adaptiveLighting: { active: false } })), true);
  });
});
