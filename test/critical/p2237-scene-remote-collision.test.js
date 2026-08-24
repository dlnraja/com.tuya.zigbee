'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2237 scene-remote-classify + FP collision guard', () => {
  it('isSceneRemoteDevice: TS004 remote yes, actuator plug remote no', () => {
    const {
      isSceneRemoteDevice,
      isButtonActuatorDriverId,
      isSleepyRemoteDevice,
    } = require('../../lib/utils/scene-remote-classify');

    assert.strictEqual(isSceneRemoteDevice({
      driver: { id: 'button_wireless_1', manifest: { id: 'button_wireless_1', class: 'button' } },
    }), true);
    assert.strictEqual(isButtonActuatorDriverId('button_wireless_plug'), true);
    assert.strictEqual(isSceneRemoteDevice({
      driver: { id: 'button_wireless_plug', manifest: { id: 'button_wireless_plug', class: 'button' } },
    }), false);
    assert.strictEqual(isSleepyRemoteDevice({
      driver: { id: 'scene_switch_4', manifest: { id: 'scene_switch_4', class: 'button' } },
    }), true);
  });

  it('cvis4qmw not on switch_4gang (mfs+canonical → switch_1gang only)', () => {
    const fs = require('fs');
    const path = require('path');
    const s4 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', 'switch_4gang', 'driver.compose.json'), 'utf8'));
    const s1 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', 'switch_1gang', 'driver.compose.json'), 'utf8'));
    const has = (j, mfr) => (j.zigbee.manufacturerName || []).some((m) => String(m).toLowerCase() === mfr.toLowerCase());
    assert.strictEqual(has(s4, '_TZ3000_cvis4qmw'), false);
    assert.strictEqual(has(s1, '_TZ3000_cvis4qmw'), true);
  });
});
