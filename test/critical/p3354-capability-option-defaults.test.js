'use strict';

/**
 * P3354: the upload app.json drops capabilitiesOptions flags equal to Homey's default
 * (getable:true, preventInsights:false; P3342 shrink). On the device getCapabilityOptions() then
 * has no flag, which Homey reads as the default. The runtime heals must read it the same way,
 * or every sensor of every device gets a setCapabilityOptions write at the next start.
 * setable and getable:false are never stripped (DynamicFlowCardManager, InteractionHistory and
 * FeatureFlowCards read them as explicit values).
 */

const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const { healSensorCapabilityGetable } = require('../../lib/utils/HomeyCapabilityUx');
const { STRIPPABLE_FLAGS, stripDefaultCapOptions } = require('../../scripts/maintenance/strip-inert-manifest.cjs');

function dev(caps, optsByCap = {}) {
  const calls = [];
  return {
    calls,
    _homeyCapabilityUxHealed: false,
    getCapabilities: () => caps.slice(),
    hasCapability: (c) => caps.includes(c),
    getCapabilityOptions: (c) => ({ ...optsByCap[c] || {} }),
    setCapabilityOptions: async (cap, opts) => { calls.push({ cap, opts }); },
    log: () => {},
  };
}

describe('P3354 missing getable/preventInsights == Homey default', () => {
  it('heal: sensors with no flag are left alone (no setCapabilityOptions)', async () => {
    const d = dev(['measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_contact', 'meter_power'],
      { measure_temperature: { units: 'C' } });
    const r = await healSensorCapabilityGetable(d);
    assert.deepStrictEqual(d.calls, []);
    assert.deepStrictEqual(r.healed, []);
  });

  it('heal: explicit getable:false or preventInsights:true is still healed', async () => {
    const d = dev(['measure_temperature', 'measure_battery'], { measure_temperature: { getable: false }, measure_battery: { preventInsights: true } });
    const r = await healSensorCapabilityGetable(d);
    assert.deepStrictEqual(r.healed.sort(), ['measure_battery', 'measure_temperature']);
    assert.ok(d.calls.every((c) => c.opts.getable === true && c.opts.preventInsights === false));
  });

  it('heal: the History silence allowlist is unchanged', async () => {
    const d = dev(['alarm_motion', 'alarm_human']);
    const r = await healSensorCapabilityGetable(d);
    assert.deepStrictEqual(r.silenced, ['alarm_motion']);
    assert.deepStrictEqual(d.calls.map((c) => c.cap), ['alarm_motion']);
  });

  it('ButtonDevice battery UI: no flag means no setCapabilityOptions', () => {
    const src = require('fs').readFileSync(require.resolve('../../lib/devices/ButtonDevice'), 'utf8');
    const block = src.slice(src.indexOf('async _ensureBatteryCapabilityUi'), src.indexOf('[BUTTON-BATTERY] P2507/P2512 restored'));
    assert.ok(!/getable !== true/.test(block) && !/preventInsights == null/.test(block), 'missing flags must read as default');
    assert.ok(/getable === false/.test(block) && /preventInsights === true/.test(block));
  });

  it('strip: only getable:true and preventInsights:false are default-stripped; setable and getable:false stay', () => {
    assert.deepStrictEqual({ ...STRIPPABLE_FLAGS }, { getable: true, preventInsights: false });
    const sys = { measure_x: { getable: true, setable: false }, onoff: { getable: true, setable: true }, button: { getable: false, setable: true } };
    const d = { capabilitiesOptions: {
      measure_x: { getable: true, preventInsights: false, setable: false },
      onoff: { setable: true },
      button: { getable: false },
    } };
    stripDefaultCapOptions(d, {}, sys, { capOptBytes: 0, capOptDropped: 0 });
    assert.deepStrictEqual(d.capabilitiesOptions, { measure_x: { setable: false }, onoff: { setable: true }, button: { getable: false } });
  });
});
