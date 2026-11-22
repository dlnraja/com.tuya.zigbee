'use strict';

/**
 * P3388 - Bastien house devices: fixes for the live couples.
 *
 * 1. LCD ZTH05Z (_TZE284_vvmbj46n + TS0601): Z2M tuya.ts ZTH05Z says DP15 is
 *    humidity_alarm (enum) and DP18 humidity_periodic_report (minutes). They must
 *    never land on measure_battery / measure_temperature. DP3 battery_state must
 *    not overwrite a real DP4 percentage (master P2766).
 * 2. P3354 port: a missing getable/preventInsights flag is Homey's default, so no
 *    setCapabilityOptions rewrite at every start (buttons and sensors).
 * 3. P3362 port: standard units on the live drivers (Insights + Apple Home).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');

const ROOT = path.join(__dirname, '..', '..');
require('../_support/homey-stub').install();

function lcdDevice(mfr, productId = 'TS0601') {
  const LCD = require('../../drivers/lcdtemphumidsensor/device');
  const store = {};
  const logs = [];
  const dev = Object.create(LCD.prototype);
  const settings = { zb_manufacturer_name: mfr, zb_model_id: productId };
  dev.getSetting = (k) => settings[k] ?? null;
  dev.getData = () => ({ manufacturerName: mfr, productId });
  dev.getStoreValue = (k) => store[k];
  dev.setStoreValue = async (k, v) => { store[k] = v; };
  dev.log = (...a) => { logs.push(a.join(' ')); };
  return { dev, store, logs };
}

describe('P3388 Bastien LCD ZTH05Z DP map (_TZE284_vvmbj46n + TS0601)', () => {
  it('DP18 humidity_periodic_report never becomes a temperature', () => {
    const { dev, store } = lcdDevice('_TZE284_vvmbj46n');
    const m = dev.dpMappings[18];
    assert.ok(m, 'DP18 stays mapped (no permissive inference)');
    assert.strictEqual(m.smartDivisor, undefined);
    assert.strictEqual(m.transform(30), null);
    assert.strictEqual(store.lcd_humidity_periodic_report, 30);
  });

  it('DP15 humidity_alarm enum never becomes a battery percentage', () => {
    const { dev, store } = lcdDevice('_TZE284_vvmbj46n');
    const m = dev.dpMappings[15];
    assert.strictEqual(m.transform(2), null);
    assert.strictEqual(store.lcd_humidity_alarm, 'cancel');
  });

  it('ZTH05Z settings DPs are stored, not inferred into capabilities', () => {
    const { dev, store } = lcdDevice('_TZE284_vvmbj46n');
    for (const dp of [9, 10, 11, 12, 13, 14, 17, 19, 20]) {
      const m = dev.dpMappings[dp];
      assert.ok(m && typeof m.transform === 'function', `DP${dp} mapped`);
      assert.strictEqual(m.transform(5), null, `DP${dp} sets no capability`);
    }
    assert.strictEqual(store.lcd_max_temperature_alarm, 0.5);
    assert.strictEqual(store.lcd_temperature_periodic_report, 5);
  });

  it('DP3 battery_state does not overwrite a real DP4 percentage (master P2766)', () => {
    const { dev } = lcdDevice('_TZE284_vvmbj46n');
    const pct = dev.dpMappings[4].transform(63);
    assert.strictEqual(pct, 63);
    assert.strictEqual(dev.dpMappings[3].transform(2), null);
  });

  it('other LCD couples keep DP15 battery and DP18 temperature (unchanged)', () => {
    const { dev } = lcdDevice('_TZE200_locansqn');
    assert.strictEqual(dev.dpMappings[18].capability, 'measure_temperature');
    assert.strictEqual(dev.dpMappings[18].smartDivisor, true);
    assert.strictEqual(dev.dpMappings[15].capability, 'measure_battery');
    assert.strictEqual(typeof dev.dpMappings[15].transform(80), 'number');
  });
});

describe('P3388 port of P3354 (no option rewrite at every start)', () => {
  it('healer does not rewrite options when flags are simply absent', async () => {
    const { healSensorCapabilityGetable } = require('../../lib/utils/HomeyCapabilityUx');
    const calls = [];
    const device = {
      getCapabilities: () => ['measure_battery'],
      getCapabilityOptions: () => ({ units: '%' }),
      setCapabilityOptions: async (cap, opts) => { calls.push({ cap, opts }); },
      log: () => {},
    };
    await healSensorCapabilityGetable(device);
    assert.deepStrictEqual(calls, []);
  });

  it('healer still repairs an explicit getable:false', async () => {
    const { healSensorCapabilityGetable } = require('../../lib/utils/HomeyCapabilityUx');
    const calls = [];
    const device = {
      getCapabilities: () => ['measure_temperature'],
      getCapabilityOptions: () => ({ getable: false, units: '\u00B0C' }),
      setCapabilityOptions: async (cap, opts) => { calls.push({ cap, opts }); },
      log: () => {},
    };
    await healSensorCapabilityGetable(device);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].opts.getable, true);
  });

  it('ButtonDevice battery heal reads a missing flag as the default', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(!/cur\.getable !== true \|\| cur\.preventInsights == null/.test(src));
  });
});

describe('P3388 port of P3362 (standard units on Bastien live drivers)', () => {
  const LIVE = ['button_wireless_1', 'button_wireless_2', 'button_wireless_3',
    'switch_1gang', 'switch_4gang', 'climate_sensor', 'lcdtemphumidsensor'];

  it('healer restores a missing unit without touching default flags', async () => {
    const { healSensorCapabilityGetable } = require('../../lib/utils/HomeyCapabilityUx');
    const calls = [];
    const device = {
      getCapabilities: () => ['measure_humidity', 'measure_power'],
      getCapabilityOptions: () => ({}),
      setCapabilityOptions: async (cap, opts) => { calls.push({ cap, opts }); },
      log: () => {},
    };
    const r = await healSensorCapabilityGetable(device);
    assert.deepStrictEqual(r.unitsHealed.sort(), ['measure_humidity', 'measure_power']);
    for (const c of calls) {assert.ok(!('getable' in c.opts));}
  });

  it('live drivers declare standard units in compose and app.json', () => {
    const { standardUnitFor, hasDeclaredUnits } = require('../../lib/utils/HomeyCapabilityUx');
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const holes = [];
    for (const id of LIVE) {
      const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
      const shipped = app.drivers.find((d) => d.id === id);
      for (const [where, d] of [['compose', compose], ['app', shipped]]) {
        const opts = d.capabilitiesOptions || {};
        for (const cap of d.capabilities || []) {
          if (standardUnitFor(cap) && !hasDeclaredUnits(opts[cap] || {})) {holes.push(`${where}:${id}:${cap}`);}
        }
      }
    }
    assert.deepStrictEqual(holes, []);
  });
});
