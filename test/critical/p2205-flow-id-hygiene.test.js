'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('P2205 button flow ID hygiene (Gmail 9cbf9eb6 / 55e3e591)', () => {
  it('button_wireless_4 compose has 4gang cards, not button_N_button_pressed', () => {
    const flow = JSON.parse(fs.readFileSync(path.join('drivers', 'button_wireless_4', 'driver.flow.compose.json'), 'utf8'));
    const ids = (flow.triggers || []).map((t) => t.id);
    assert.ok(ids.includes('button_wireless_4_button_4gang_button_1_pressed'));
    assert.ok(!ids.includes('button_wireless_4_button_1_button_pressed'));
    assert.ok(!ids.includes('button_wireless_4_button_1gang_button_pressed'));
  });

  it('scene_switch_4 has short + 4gang forms, not 1gang_button_pressed', () => {
    const flow = JSON.parse(fs.readFileSync(path.join('drivers', 'scene_switch_4', 'driver.flow.compose.json'), 'utf8'));
    const ids = (flow.triggers || []).map((t) => t.id);
    assert.ok(ids.includes('scene_switch_4_button_1_pressed'));
    assert.ok(ids.includes('scene_switch_4_button_4gang_button_1_pressed'));
    assert.ok(!ids.includes('scene_switch_4_button_1gang_button_pressed'));
  });

  it('contact_sensor has illuminance_changed for Peter lux Flows', () => {
    const flow = JSON.parse(fs.readFileSync(path.join('drivers', 'contact_sensor', 'driver.flow.compose.json'), 'utf8'));
    const ids = (flow.triggers || []).map((t) => t.id);
    assert.ok(ids.includes('contact_sensor_illuminance_changed'));
  });

  it('DeviceOperatingMode skips 0x8004 for Nobø xffhmvhv', () => {
    const DOM = require('../../lib/zigbee/DeviceOperatingMode');
    const fake = {
      getSetting: (k) => (k === 'zb_manufacturer_name' ? '_TZ3000_xffhmvhv' : k === 'zb_model_id' ? 'TS004F' : null),
      getData: () => ({ manufacturerName: '_TZ3000_xffhmvhv', modelId: 'TS004F' }),
      driver: { id: 'button_wireless_4' },
    };
    const f = DOM.classifyOperatingFamily(fake);
    assert.equal(f.writeSceneAttr, false);
    assert.equal(f.family, 'ts0044');
  });
});
