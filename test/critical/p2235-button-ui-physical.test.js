'use strict';

/**
 * P2235 — button UI/UX + physical: no phantom onoff, no sleepy re-bind,
 * no *_physical_on for remotes, no blind 0x8004, preserve rotate_*
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2235 button UI / physical hardening', () => {
  it('FlowCardHeuristics: remotes never get *_physical_on candidates', () => {
    const { buildPhysicalFlowCandidates } = require('../../lib/flow/FlowCardHeuristics');
    const remote = buildPhysicalFlowCandidates('scene_switch_4', 1, 'single', {
      gangCount: 4,
      isButtonDevice: true,
    });
    assert.ok(!remote.some((id) => /_physical_on$|_physical_gang\d+_on$/.test(id)));
    assert.ok(remote.some((id) => /button_pressed|button_1_pressed|button_4gang/.test(id)));

    const wall = buildPhysicalFlowCandidates('wall_switch_2gang_1way', 2, 'single', {
      gangCount: 2,
      isButtonDevice: false,
    });
    assert.ok(wall.some((id) => id.includes('physical_gang2_on') || id.includes('physical_on')));
  });

  it('DeviceOperatingMode: unknown model on button_wireless_4 does not write 0x8004', () => {
    const { classifyOperatingFamily } = require('../../lib/zigbee/DeviceOperatingMode');
    const fam = classifyOperatingFamily({
      driver: { id: 'button_wireless_4' },
      getSetting: () => null,
      getStoreValue: () => null,
      getData: () => ({}),
    });
    assert.strictEqual(fam.writeSceneAttr, false);
  });

  it('DeviceOperatingMode: known TS004F still writes scene attr', () => {
    const { classifyOperatingFamily } = require('../../lib/zigbee/DeviceOperatingMode');
    const fam = classifyOperatingFamily({
      driver: { id: 'button_wireless_4' },
      getSetting: (k) => (k === 'zb_model_id' ? 'TS004F' : null),
      getStoreValue: () => null,
      getData: () => ({}),
    });
    assert.strictEqual(fam.writeSceneAttr, true);
    assert.strictEqual(fam.family, 'ts004f');
  });

  it('ButtonCaptureCascade skips silent OnOff re-bind on sleepy remotes', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', 'lib', 'mixins', 'ButtonCaptureCascade.js'),
      'utf8'
    );
    assert.ok(src.includes('skip silent OnOff re-bind'));
    assert.ok(src.includes('isSleepyRemote'));
  });

  it('DCM refuses onoff for button class and SOS; allows actuators', () => {
    const DynamicCapabilityManager = require('../../lib/managers/DynamicCapabilityManager');
    const dcm = Object.create(DynamicCapabilityManager.prototype);

    dcm.device = {
      driver: { id: 'button_wireless_4', manifest: { id: 'button_wireless_4', class: 'button' } },
      _forbiddenCapabilities: ['onoff', 'dim'],
      getClass: () => 'button',
    };
    assert.strictEqual(dcm._isIrrelevantCap('onoff'), true);
    assert.strictEqual(dcm._isIrrelevantCap('dim'), true);

    dcm.device = {
      driver: { id: 'button_emergency_sos', manifest: { id: 'button_emergency_sos', class: 'button' } },
      _forbiddenCapabilities: [],
      getClass: () => 'button',
    };
    assert.strictEqual(dcm._isIrrelevantCap('onoff'), true);

    dcm.device = {
      driver: { id: 'button_wireless_plug', manifest: { id: 'button_wireless_plug', class: 'socket' } },
      _forbiddenCapabilities: [],
      getClass: () => 'socket',
    };
    assert.strictEqual(dcm._isIrrelevantCap('onoff'), false);
  });

  it('PhysicalButtonMixin preserves rotate press type into trigger path', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', 'lib', 'mixins', 'PhysicalButtonMixin.js'),
      'utf8'
    );
    assert.ok(src.includes("press = dir === 1 ? 'rotate_left'"));
    assert.ok(src.includes('_triggerPhysicalFlow(gang, press, { rotate: true'));
    assert.ok(src.includes("self._triggerPhysicalFlow(gang, pt, { rotate: true"));
  });
});
