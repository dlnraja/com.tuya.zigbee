'use strict';

/**
 * P2450 — diag a342c411 (press dead) + 8adfe4ce (still not working @ 9.0.857)
 * Root: stuck button_mode=dimmer + late MFR-ENSURE without scene re-apply.
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const fs = require('fs');
const path = require('path');

const {
  classifyOperatingFamily,
  applyDesiredMode,
  TS004F_ONE_BUTTON_SCENE_MFR,
} = require('../../lib/zigbee/DeviceOperatingMode');

function mockDevice({ mfr, pid, driver, buttonMode, store = {} }) {
  const settings = {
    zb_manufacturer_name: mfr || '',
    zb_model_id: pid || '',
    button_mode: buttonMode,
  };
  return {
    driver: { id: driver },
    logs: [],
    log(...args) { this.logs.push(args.join(' ')); },
    getSetting(k) { return settings[k] ?? null; },
    getStoreValue(k) { return store[k] ?? null; },
    async setStoreValue(k, v) { store[k] = v; },
    async setSettings(u) { Object.assign(settings, u); },
    getData() { return { manufacturerName: mfr, productId: pid }; },
  };
}

describe('P2450 — kaflzta4 stuck dimmer + identity re-apply', () => {
  it('exports one-btn scene mfr regex covering kaflzta4', () => {
    assert.ok(TS004F_ONE_BUTTON_SCENE_MFR.test('_TZ3000_kaflzta4'));
  });

  it('applyDesiredMode resets stuck dimmer → scene for kaflzta4', async () => {
    const device = mockDevice({
      mfr: '_TZ3000_kaflzta4',
      pid: 'TS004F',
      driver: 'smart_knob',
      buttonMode: 'dimmer',
    });
    // No zclNode → write fails but desired must still be scene after reset
    const r = await applyDesiredMode(device, null);
    assert.strictEqual(device.getSetting('button_mode'), 'auto');
    assert.strictEqual(r.desired, 'scene');
    assert.ok(device.logs.some((l) => /P2450 reset stuck dimmer/.test(l)));
  });

  it('ABSENT@smart_knob stuck dimmer also resets (wake before MFR-ENSURE)', async () => {
    const device = mockDevice({
      mfr: '',
      pid: '',
      driver: 'smart_knob',
      buttonMode: 'dimmer',
    });
    const fam = classifyOperatingFamily(device);
    assert.strictEqual(fam.family, 'ts004f');
    assert.strictEqual(fam.defaultMode, 'scene');
    const r = await applyDesiredMode(device, null);
    assert.strictEqual(r.desired, 'scene');
    assert.strictEqual(device.getSetting('button_mode'), 'auto');
  });

  it('user force dimmer store flag preserves command desire', async () => {
    const device = mockDevice({
      mfr: '_TZ3000_kaflzta4',
      pid: 'TS004F',
      driver: 'smart_knob',
      buttonMode: 'dimmer',
      store: { p2450_user_force_dimmer: true },
    });
    const r = await applyDesiredMode(device, null);
    assert.strictEqual(r.desired, 'command');
  });

  it('rotary uri7ongn keeps dimmer (not reset)', async () => {
    const device = mockDevice({
      mfr: '_TZ3000_uri7ongn',
      pid: 'TS004F',
      driver: 'smart_knob',
      buttonMode: 'dimmer',
    });
    const r = await applyDesiredMode(device, null);
    assert.strictEqual(r.desired, 'command');
    assert.strictEqual(device.getSetting('button_mode'), 'dimmer');
  });

  it('PhysicalButtonMixin identity hook covers kaflzta4 / P2450', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../lib/mixins/PhysicalButtonMixin.js'),
      'utf8',
    );
    assert.ok(/P2450/.test(src));
    assert.ok(/isOneBtnSceneKnob/.test(src));
    assert.ok(/kaflzta4\|ja5osu5g\|an5rjiwd/.test(src));
    assert.ok(/applyDesiredMode/.test(src));
  });
});
