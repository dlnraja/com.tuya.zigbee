'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveConfigAttr,
  samePowerOn,
  POWER_ON_FROM_ZCL,
  SWITCH_MODE_FROM_ZCL,
  isConfigSettingKey,
} = require('../../lib/zigbee/ZclSwitchConfigPolicy');

describe('ZclSwitchConfigPolicy', () => {
  it('re-forces Homey power-on when the boot dump disagrees', () => {
    const r = resolveConfigAttr('off', 1, POWER_ON_FROM_ZCL, samePowerOn);
    assert.equal(r.action, 'write');
    assert.equal(r.stored, 'off');
  });

  it('treats previous and memory as the same power-on setting', () => {
    const r = resolveConfigAttr('previous', 2, POWER_ON_FROM_ZCL, samePowerOn);
    assert.equal(r.action, 'keep');
  });

  it('seeds from the device only when Homey has no setting yet', () => {
    const r = resolveConfigAttr(null, 0, SWITCH_MODE_FROM_ZCL);
    assert.equal(r.action, 'seed');
    assert.equal(r.stored, 'toggle');
  });

  it('marks backlight, power-on and inching as config keys, not gang onoff', () => {
    assert.equal(isConfigSettingKey('backlight_mode'), true);
    assert.equal(isConfigSettingKey('power_on_behavior'), true);
    assert.equal(isConfigSettingKey('inching_mode_1'), true);
    assert.equal(isConfigSettingKey('inching_duration_2'), true);
    assert.equal(isConfigSettingKey('onoff'), false);
  });
});
