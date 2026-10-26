'use strict';
// P3067 family 9 (soil): Z2M hobeian.ts CS-201Z / ZG-303Z report their own calibration (DP102 soil, DP104
// temperature /10, DP105 humidity) and sampling/warning DPs (110/111/112). They must not land in the Homey
// offset settings (temperature_calibration / humidity_calibration are re-applied by _applyCalibration).
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const Device = require(path.join(ROOT, 'drivers/soil_sensor/device.js'));

function fake() {
  const settings = {};
  const store = {};
  const d = Object.create(Device.prototype);
  Object.assign(d, {
    getSetting: (k) => settings[k], getSettings: () => settings,
    setSettings: async (o) => Object.assign(settings, o),
    getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; },
    log: () => {}, error: () => {}, hasCapability: () => false, safeSetCapabilityValue: async () => {},
  });
  Object.defineProperty(d, 'isZG303ZVariant', { value: true });
  Object.defineProperty(d, 'isZsSf00Variant', { value: false });
  return { d, settings, store };
}
const tick = () => new Promise((r) => setTimeout(r, 5));

describe('P3067 soil_sensor device-side calibration', () => {
  it('DP104/105/102 go to the store (DP104 in tenths), never to the Homey offset settings', async () => {
    const { d, settings, store } = fake();
    d._handleDP(104, 15); await tick();
    d._handleDP(105, -3); await tick();
    d._handleDP(102, 4); await tick();
    assert.strictEqual(settings.temperature_calibration, undefined);
    assert.strictEqual(settings.humidity_calibration, undefined);
    assert.deepStrictEqual(store.device_reported, { temperature_calibration: 1.5, humidity_calibration: -3, soil_calibration: 4 });
  });
  it('DP110/111 (warning, sampling) are kept in the store', async () => {
    const { d, settings, store } = fake();
    d._handleDP(110, 25); await tick();
    d._handleDP(111, 60); await tick();
    assert.deepStrictEqual(settings, {});
    assert.deepStrictEqual(store.device_reported, { soil_warning: 25, temperature_sampling: 60 });
  });
});
