'use strict';
// P3067 family 8 (lights): wall_dimmer_tuya per-layout settings. MG-DIM02Z (Z2M tuya.ts: DP143 min_brightness,
// DP144 max_brightness, DP146 power_on_state) and knob dimmer tgeqdjgk (DP106 power_on_behavior, DP141 mode).
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const Device = require(path.join(ROOT, 'drivers/wall_dimmer_tuya/device.js'));

function fake(mfr) {
  const settings = {};
  const writes = [];
  const d = Object.create(Device.prototype);
  Object.assign(d, {
    getSetting: (k) => (k === 'zb_manufacturer_name' ? mfr : settings[k]),
    setSettings: async (o) => Object.assign(settings, o),
    getData: () => ({}), log: () => {}, error: () => {},
    hasCapability: () => false, safeSetCapabilityValue: async () => {},
    writeData32: async (dp, v) => { writes.push(['v', dp, v]); return true; },
    writeEnum: async (dp, v) => { writes.push(['e', dp, v]); return true; },
  });
  return { d, settings, writes };
}
const tick = () => new Promise((r) => setTimeout(r, 5));

describe('P3067 wall_dimmer_tuya MG-DIM02Z / knob settings', () => {
  it('MG-DIM02Z: power-on on DP146, min/max on DP143/144, no V1 backlight/light type', async () => {
    const { d, writes } = fake('_TZE284_da26abzz');
    await d.onSettings({ newSettings: { power_on_behavior: 'on', mg_min_brightness: 50, mg_max_brightness: 2000, backlight_mode: 'off', light_type: 'halogen' },
      changedKeys: ['power_on_behavior', 'mg_min_brightness', 'mg_max_brightness', 'backlight_mode', 'light_type'] });
    assert.deepStrictEqual(writes, [['e', 146, 1], ['v', 143, 50], ['v', 144, 1000]]);
  });
  it('knob: power-on on DP106, mode on DP141', async () => {
    const { d, writes } = fake('_TZE200_tgeqdjgk');
    await d.onSettings({ newSettings: { power_on_behavior: 'off', knob_mode: 'scene' }, changedKeys: ['power_on_behavior', 'knob_mode'] });
    assert.deepStrictEqual(writes, [['e', 106, 0], ['e', 141, 1]]);
  });
  it('V1 dimmer keeps DP14 power-on and ignores the layout settings', async () => {
    const { d, writes } = fake('_TZE200_3p5ydos3');
    await d.onSettings({ newSettings: { power_on_behavior: 'previous', mg_min_brightness: 5, knob_mode: 'scene' }, changedKeys: ['power_on_behavior', 'mg_min_brightness', 'knob_mode'] });
    assert.deepStrictEqual(writes, [['e', 14, 2]]);
  });
  it('reports are mirrored into the settings page', async () => {
    const mg = fake('_TZE284_da26abzz');
    mg.d._processLayoutDp(143, 30); mg.d._processLayoutDp(146, 2);
    const k = fake('_TZE284_tgeqdjgk');
    k.d._processLayoutDp(141, 1); k.d._processLayoutDp(106, 0);
    await tick();
    assert.deepStrictEqual(mg.settings, { mg_min_brightness: 30, power_on_behavior: 'previous' });
    assert.deepStrictEqual(k.settings, { knob_mode: 'scene', power_on_behavior: 'off' });
  });
});
