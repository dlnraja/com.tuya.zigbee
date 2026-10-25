'use strict';

/**
 * Tests — P3040b, owner rule: a less complete interview never degrades a driver nor removes a
 * capability a user already saw. Only a phantom we added and that is never fed may go.
 *  - motion_sensor: no more battery strip at every start (battery driver), no temp/humidity removal
 *    on a missing cluster, PIR-only / permissive cleanups only drop a never-fed (null) capability;
 *  - presence_sensor_radar: stale caps removed only when proven phantom for this radar
 *    (DEFAULT config = mfr not resolved => nothing config-dependent is removed).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const MOTION_SRC = fs.readFileSync(path.join(ROOT, 'drivers/motion_sensor/device.js'), 'utf8');

function trace(driver) {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts/perf/pairing-trace.js'), '--json', driver],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 55000 });
  return JSON.parse(out)[0];
}

function fakeDevice(Cls, caps, values = {}) {
  const self = Object.create(Cls.prototype);
  const set = new Set(caps);
  const removed = [];
  Object.defineProperty(self, 'log', { value: () => {} });
  Object.assign(self, {
    hasCapability: (c) => set.has(c),
    getCapabilityValue: (c) => c in values ? values[c] : null,
    removeCapability: async (c) => { set.delete(c); removed.push(c); },
  });
  return { self, removed, set };
}

describe('P3040b — no capability loss on a less complete interview', function () {
  if (this && typeof this.timeout === 'function') {this.timeout(120000);}

  it('motion_sensor no longer strips the battery at every start', () => {
    assert.ok(!/Auto-fix: Remove battery capabilities for mains-powered devices/.test(MOTION_SRC));
    assert.ok(/get mainsPowered\(\) \{ return false; \}/.test(MOTION_SRC));
  });

  it('motion_sensor: real init keeps temperature/humidity and the battery', () => {
    const r = trace('motion_sensor');
    for (const c of ['measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_battery']) {
      assert.ok(!r.capsRemoved.includes(c), `${c} removed: ${JSON.stringify(r.capsRemoved)}`);
    }
  });

  it('motion_sensor: a fed capability is kept, a never-fed phantom goes', async () => {
    require('./_support/homey-stub').install();
    const Cls = require(path.join(ROOT, 'drivers/motion_sensor/device.js'));
    const fed = fakeDevice(Cls, ['measure_temperature', 'measure_humidity'], { measure_temperature: 0, measure_humidity: 10 });
    assert.strictEqual(await Cls.prototype._retireUnfedCapability.call(fed.self, 'measure_temperature', 't'), false);
    assert.strictEqual(await Cls.prototype._retireUnfedCapability.call(fed.self, 'measure_humidity', 't'), false);
    assert.deepStrictEqual(fed.removed, []);
    const phantom = fakeDevice(Cls, ['measure_temperature']);
    assert.strictEqual(await Cls.prototype._retireUnfedCapability.call(phantom.self, 'measure_temperature', 't'), true);
    assert.deepStrictEqual(phantom.removed, ['measure_temperature']);
  });

  it('presence_sensor_radar: a battery we added at init and never fed still goes (mains _TZE204_ijxvkhd0)', () => {
    const r = trace('presence_sensor_radar');
    assert.ok(!r.finalCaps.includes('measure_battery'), JSON.stringify(r.finalCaps));
    assert.ok(r.txTotal < 35, `txTotal ${r.txTotal}`);
  });

  describe('presence_sensor_radar proven phantoms', () => {
    require('./_support/homey-stub').install();
    const Cls = require(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'));
    const radar = (mfr, cfg, values = {}) => {
      const self = Object.create(Cls.prototype);
      Object.defineProperty(self, 'log', { value: () => {} });
      self._manufacturerName = mfr;
      self._getRadarConfig = () => cfg;
      self.getCapabilityValue = (c) => c in values ? values[c] : null;
      self.driver = { manifest: { capabilities: ['alarm_motion', 'measure_luminance', 'alarm_human', 'measure_luminance.distance'] } };
      return self;
    };
    const FED = { measure_battery: 80, alarm_battery: false, measure_temperature: 21.5, measure_humidity: 40,
      'alarm_motion.zone1': false, 'alarm_motion.zone2': false, 'measure_motion.classification': 1 };
    const phantom = (self, cap) => Cls.prototype._radarStaleCapIsProvenPhantom.call(self, cap);
    const DEFAULT = { configName: 'DEFAULT', hasMultiZone: false, noTemperature: true, noHumidity: true, dpMap: {} };

    it('DEFAULT config (mfr not resolved): battery, temperature, humidity, zones a user saw are kept', () => {
      const r = radar('_TZE200_unknown01', DEFAULT, FED);
      for (const c of ['measure_battery', 'alarm_battery', 'measure_temperature', 'measure_humidity', 'alarm_motion.zone1', 'measure_motion.classification']) {
        assert.strictEqual(phantom(r, c), false, c);
      }
    });

    it('a runtime-added capability that was never fed is a phantom, a compose capability is not', () => {
      const r = radar('_TZE200_unknown01', DEFAULT);
      assert.strictEqual(phantom(r, 'measure_battery'), true);
      assert.strictEqual(Cls.prototype._radarCapNeverFedRuntimeAdd.call(r, 'alarm_motion'), false);
    });

    it('curtain / dim DynCap poison is always a phantom', () => {
      const r = radar('', DEFAULT);
      for (const c of ['windowcoverings_set', 'windowcoverings_state', 'dim']) {assert.strictEqual(phantom(r, c), true, c);}
    });

    it('battery caps are a phantom on a mains MTG radar, not on a battery radar', () => {
      assert.strictEqual(phantom(radar('_TZE204_clrdrnya', { configName: 'MTG', hasRelay: true }), 'measure_battery'), true);
      assert.strictEqual(phantom(radar('_TZE200_batt0001', { configName: 'BATTERY_RADAR', battery: true }, FED), 'measure_battery'), false);
    });

    it('temperature only goes when the resolved config says the radar has none', () => {
      assert.strictEqual(phantom(radar('_TZE200_x1', { configName: 'X', noTemperature: true }), 'measure_temperature'), true);
      assert.strictEqual(phantom(radar('_TZE200_x1', { configName: 'X' }, FED), 'measure_temperature'), false);
    });

    it('zones only go when the resolved config is single-zone', () => {
      assert.strictEqual(phantom(radar('_TZE200_x1', { configName: 'X', hasMultiZone: false }), 'alarm_motion.zone2'), true);
      assert.strictEqual(phantom(radar('_TZE200_x1', { configName: 'X', hasMultiZone: true }, FED), 'alarm_motion.zone2'), false);
    });
  });
});
