'use strict';

/**
 * P3361 - Bastien TS0043 (and sibling scene remotes) battery History.
 *
 * Contre quoi: measure_battery was getable with Insights allowed, but units
 * were missing. Homey then paints no History graph. button_wireless_1 (TS0041)
 * already had units "%" and a History tab; TS0042 / TS0043 did not.
 * The boot healer only rewrote options when getable was false or
 * preventInsights was true, so a default-flag tip never restored units.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

const TS004X_DRIVERS = [
  'button_wireless_1',
  'button_wireless_2',
  'button_wireless_3',
  'button_wireless_4',
  'button_wireless_6',
];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function batteryOpts(obj) {
  return (obj.capabilitiesOptions || {}).measure_battery || {};
}

describe('P3361 TS004x battery History units', () => {
  it('compose and app.json ship units % on TS004x remotes', () => {
    const app = readJson('app.json');
    for (const id of TS004X_DRIVERS) {
      const compose = readJson(path.join('drivers', id, 'driver.compose.json'));
      assert.ok((compose.capabilities || []).includes('measure_battery'), id);
      assert.equal(batteryOpts(compose).units, '%', `compose ${id}`);
      assert.notEqual(batteryOpts(compose).preventInsights, true, `compose ${id}`);
      const d = (app.drivers || []).find((x) => x.id === id);
      assert.ok(d, `${id} in app.json`);
      assert.equal(batteryOpts(d).units, '%', `app.json ${id}`);
      assert.notEqual(batteryOpts(d).preventInsights, true, `app.json ${id}`);
    }
    const bw3 = readJson('drivers/button_wireless_3/driver.compose.json');
    assert.ok((bw3.zigbee?.productId || []).includes('TS0043'));
  });

  it('every shipped measure_battery capability has units %', () => {
    const app = readJson('app.json');
    const missing = [];
    for (const d of app.drivers || []) {
      if (!(d.capabilities || []).includes('measure_battery')) {continue;}
      if (batteryOpts(d).units !== '%') {missing.push(d.id);}
    }
    assert.deepEqual(missing, []);
  });

  it('ButtonDevice restores units when flags already match Homey defaults', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('P3361 restored measure_battery units'));
    assert.ok(src.includes('p3361_batt_insights_recycle'));

    const start = src.indexOf('async _ensureBatteryCapabilityUi');
    const end = src.indexOf('\n  async _ingestButtonBatterySample', start);
    assert.ok(start > 0 && end > start, 'healer bounds');
    const fnSrc = `async function _ensureBatteryCapabilityUi${src.slice(start + 'async _ensureBatteryCapabilityUi'.length, end)}`;
    const wrapped = `${fnSrc}\nthis._ensureBatteryCapabilityUi = _ensureBatteryCapabilityUi`;
    const store = {};
    const calls = [];
    const ctx = {
      hasCapability: (c) => c === 'measure_battery',
      addCapability: async () => {},
      removeCapability: async () => {},
      getCapabilityOptions: () => ({ title: { en: 'Battery' } }),
      setCapabilityOptions: async (cap, opts) => { calls.push({ cap, opts }); },
      getStoreValue: (k) => store[k],
      setStoreValue: async (k, v) => { store[k] = v; },
      log: () => {},
    };
    vm.runInNewContext(wrapped, ctx);
    // Prior P2555 recycle already ran; units still missing (the Bastien case).
    store.p2555_batt_insights_recycle = 1;
    store.p2550_batt_insights_recycle = 1;
    store.last_battery_from_report = true;
    store.last_battery_percentage = 90;
    await ctx._ensureBatteryCapabilityUi();
    assert.ok(calls.some((c) => c.cap === 'measure_battery' && c.opts.units === '%'));
    assert.equal(store.p3361_batt_insights_recycle, 1);
    assert.equal(store.p2555_batt_insights_recycle, 1);
  });

  it('ButtonDevice does not recycle again when units are already present', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    const start = src.indexOf('async _ensureBatteryCapabilityUi');
    const end = src.indexOf('\n  async _ingestButtonBatterySample', start);
    const fnSrc = `async function _ensureBatteryCapabilityUi${src.slice(start + 'async _ensureBatteryCapabilityUi'.length, end)}`;
    const wrapped = `${fnSrc}\nthis._ensureBatteryCapabilityUi = _ensureBatteryCapabilityUi`;
    const store = { p2555_batt_insights_recycle: 1, p3361_batt_insights_recycle: 1 };
    const calls = [];
    const ctx = {
      hasCapability: (c) => c === 'measure_battery',
      addCapability: async () => { calls.push('add'); },
      removeCapability: async () => { calls.push('remove'); },
      getCapabilityOptions: () => ({ getable: true, preventInsights: false, units: '%' }),
      setCapabilityOptions: async () => { calls.push('opts'); },
      getStoreValue: (k) => store[k],
      setStoreValue: async () => {},
      log: () => {},
    };
    vm.runInNewContext(wrapped, ctx);
    await ctx._ensureBatteryCapabilityUi();
    assert.deepEqual(calls, []);
  });
});
