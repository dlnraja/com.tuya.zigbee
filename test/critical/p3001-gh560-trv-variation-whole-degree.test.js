'use strict';

/**
 * P3001 — #560 artisare (23/10): TRV06 whole-degree + TRVs never get water-valve maps
 *
 * Contre quoi:
 * - ManufacturerVariationManager routed every driver id containing "valve"
 *   (device_radiator_valve, radiator_valve, …) to the water-valve DP map
 *   (DP2=onoff, DP5=countdown) → standard TRV maps were shadowed.
 * - TRV06 `_TZE200_rxq4iti9` firmware is whole °C only (Z2M TRV06 docs, step 1;
 *   Z2M discussion #24659) → UI step and TX snap to 1 °C.
 * Dual-app: BOTH · Forum: silent only
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MVM = require(path.join(ROOT, 'lib/ManufacturerVariationManager'));

describe('P3001 TRV variation routing + TRV06 whole degree', () => {
  it('radiator / thermostat drivers never receive the water-valve map', () => {
    for (const d of ['device_radiator_valve', 'radiator_valve', 'thermostatic_radiator_valve',
      'radiator_valve_zigbee', 'device_radiator_valve_smart', 'device_radiator_valve_thermostat']) {
      const c = MVM.getManufacturerConfig('_TZE200_rxq4iti9', 'TS0601', d);
      assert.notEqual(c.specialHandling, 'tuya_dp_water_valve', d);
      assert.equal(Object.keys(c.dpMappings || {}).length, 0, d);
    }
  });

  it('real water valves keep their variation map', () => {
    for (const d of ['water_valve_garden', 'valve_single']) {
      const c = MVM.getManufacturerConfig('_TZE200_81isopgh', 'TS0601', d);
      assert.equal(c.specialHandling, 'tuya_dp_water_valve', d);
      assert.ok(c.dpMappings[1], d);
    }
  });

  it('thermostat base drops a water-valve variation defensively', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedThermostatBase.js'), 'utf8');
    assert.ok(src.includes("config.specialHandling === 'tuya_dp_water_valve'"));
    assert.ok(src.indexOf('P3001') < src.indexOf('ManufacturerVariationManager.applyManufacturerConfig(this, config)'));
  });

  it('TRV06 setpoint snaps to whole °C and UI step is 1', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/device_radiator_valve/device.js'), 'utf8');
    assert.ok(src.includes('_alignTrv06WholeDegree'));
    assert.ok(src.includes('await this._alignTrv06WholeDegree();'));
    assert.match(src, /this\._isNoHumidityTrv\(\) \? Math\.round\(Number\(v\)\) : Number\(v\)/);
    assert.match(src, /step: 1, decimals: 0/);
  });

  it('_alignTrv06WholeDegree runtime: sets options once, only for TRV06', async () => {
    const Dev = { prototype: {} };
    const src = fs.readFileSync(path.join(ROOT, 'drivers/device_radiator_valve/device.js'), 'utf8');
    const start = src.indexOf('  async _alignTrv06WholeDegree() {');
    const end = src.indexOf('  async _alignTrv06Battery() {');
    const body = src.slice(start, end).replace('async _alignTrv06WholeDegree()', 'async function f()');
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${body.trim().replace(/^async function f\(\)/, 'async function()')})`)();
    const mk = (trv06, opts) => {
      const calls = [];
      return {
        calls,
        _isNoHumidityTrv: () => trv06,
        hasCapability: () => true,
        getCapabilityOptions: () => opts,
        setCapabilityOptions: async (c, o) => { calls.push([c, o]); },
        log: () => {},
      };
    };
    const a = mk(true, { min: 5, max: 35 });
    await fn.call(a);
    assert.deepEqual(a.calls, [['target_temperature', { min: 5, max: 35, step: 1, decimals: 0 }]]);
    const b = mk(true, { step: 1, decimals: 0 });
    await fn.call(b);
    assert.equal(b.calls.length, 0);
    const c = mk(false, {});
    await fn.call(c);
    assert.equal(c.calls.length, 0);
    void Dev;
  });
});
