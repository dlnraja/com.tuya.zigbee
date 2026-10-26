'use strict';
// P3062 (rescued from reprise-b-1010, written 2026-10-10): Wi-Fi local leftovers — colour temperature direction, enum fan speeds,
// string thermostat modes and the opt-in time-based cover estimator.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const Module = require('module');

function loadDriver(rel) {
  const orig = Module._load;
  Module._load = function (r, ...a) {
    if (r === 'homey') {return { Device: class {}, Driver: class {}, App: class {}, SimpleClass: class {} };}
    return orig.call(this, r, ...a);
  };
  try { return require(rel); } finally { Module._load = orig; }
}

describe('P2810 Wi-Fi local conversions', () => {
  it('wifi_light / wifi_led_strip: Tuya 0 = warm maps to Homey 1 (warm); opt-in reverse', () => {
    for (const rel of ['../../drivers/wifi_light/device.js', '../../drivers/wifi_led_strip/device.js']) {
      const D = loadDriver(rel);
      const d = Object.create(D.prototype);
      let rev = false;
      d.getSetting = (k) => (k === 'color_temp_reversed' ? rev : null);
      const m = d.dpMappings['23'];
      assert.strictEqual(m.transform(0), 1);
      assert.strictEqual(m.transform(1000), 0);
      assert.strictEqual(m.reverseTransform(1), 0);
      assert.strictEqual(m.reverseTransform(0.5), 500);
      rev = true;
      assert.strictEqual(m.transform(0), 0);
      assert.strictEqual(m.reverseTransform(1), 1000);
    }
  });

  it('wifi_fan: enum speed tokens convert both ways, numeric path unchanged', () => {
    const D = loadDriver('../../drivers/wifi_fan/device.js');
    const d = Object.create(D.prototype);
    d.getSetting = () => null;
    const m = d.dpMappings['3'];
    assert.strictEqual(m.transform('high'), 1);
    assert.strictEqual(m.reverseTransform(0.3), 'low');
    assert.strictEqual(m.transform(50), 0.5);
    assert.strictEqual(m.reverseTransform(0.5), 50);
  });

  it('wifi_thermostat: string mode vocabularies map to valid thermostat_mode and back', () => {
    const D = loadDriver('../../drivers/wifi_thermostat/device.js');
    const d = Object.create(D.prototype);
    const m = d.dpMappings['4'];
    assert.strictEqual(m.transform('hot'), 'heat');
    assert.strictEqual(m.reverseTransform('cool'), 'cold');
    assert.strictEqual(m.transform(2), 'auto');
    assert.strictEqual(m.reverseTransform('eco'), 3);
  });

  it('CoverTravelEstimator integrates motion time and plans timed moves', () => {
    const E = require('../../lib/tuya-local/CoverTravelEstimator');
    const e = new E({ travelMs: 10000 });
    assert.strictEqual(e.plan(0.5), null); // unknown start: no partial move
    assert.deepStrictEqual(e.plan(1), { state: 'up', ms: 0 });
    e.onState('up', 0); // unknown → assumes closed start
    assert.strictEqual(e.onState('idle', 4000), 0.4);
    assert.deepStrictEqual(e.plan(0.9), { state: 'up', ms: 5000 });
    assert.strictEqual(new E({ travelMs: 0 }).enabled, false);
  });
});

describe('P2810 gateway sub-device liveness + battery sleep window', () => {
  it('TuyaZigbeeBridge marks silent sub-devices stale and alive again (opt-in)', () => {
    const Bridge = require('../../lib/tuya-local/TuyaZigbeeBridge');
    const b = new Bridge({ gatewayId: 'g', gatewayKey: 'k', gatewayIp: '1.2.3.4', log: { log() {}, error() {} }, heartbeatMs: 10000 });
    const ev = [];
    b.on('sub-device-stale', (e) => ev.push(['stale', e.cid]));
    b.on('sub-device-alive', (e) => ev.push(['alive', e.cid]));
    b.registerSubDevice('a1', {});
    b.registerSubDevice('bat', { sleepMs: 3600000 });
    b._handleGatewayData({ cid: 'a1', dps: { 1: true } });
    b._handleGatewayData({ cid: 'bat', dps: { 1: true } });
    const now = Date.now();
    b._heartbeatTick(now + 31000);
    assert.deepStrictEqual(ev, [['stale', 'a1']]); // battery child still inside its sleep allowance
    b._handleGatewayData({ cid: 'a1', dps: { 1: false } });
    assert.deepStrictEqual(ev[1], ['alive', 'a1']);
    b.disconnect();
    assert.strictEqual(b._heartbeatTimer, null);
  });

  it('battery sleep window resolver is opt-in and bounded', () => {
    const { resolveSleepWindowMs } = require('../../lib/tuya-local/wifiLanReliabilitySettings');
    assert.strictEqual(resolveSleepWindowMs({}), 0);
    assert.strictEqual(resolveSleepWindowMs({ wifi_sleep_window_minutes: 30 }), 1800000);
    assert.strictEqual(resolveSleepWindowMs({ wifi_sleep_window_minutes: 99999 }), 1440 * 60000);
  });
});
