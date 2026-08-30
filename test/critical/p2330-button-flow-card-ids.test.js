'use strict';
/**
 * P2330 — Button/switch physical flow card ID hygiene
 * WHY: drivers named `*_switch` invented `*_switch_switch_Ngang_*` IDs that
 * never matched driver.flow.compose.json → Homey Flows never fired.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function flowIds(driverId) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.flow.compose.json');
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const ids = new Set();
  for (const k of ['triggers', 'conditions', 'actions']) {
    for (const c of j[k] || []) {
      if (c && c.id) ids.add(c.id);
    }
  }
  return ids;
}

describe('P2330 button/switch flow card ID ↔ compose', () => {
  it('button_wireless_switch device.js does not invent double-switch IDs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_switch/device.js'), 'utf8');
    assert.doesNotMatch(src, /button_wireless_switch_switch_2gang/);
    assert.match(src, /_triggerPhysicalFlow|_safeTriggerFlow/);
    const ids = flowIds('button_wireless_switch');
    assert.ok(ids.has('button_wireless_switch_2gang_physical_gang1_on'));
    assert.ok(ids.has('button_wireless_switch_physical_gang1_on'));
    assert.ok(!ids.has('button_wireless_switch_switch_2gang_physical_gang1_on'));
  });

  it('button_wireless_switch driver.js registers compose-real trigger IDs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_switch/driver.js'), 'utf8');
    assert.doesNotMatch(src, /button_wireless_switch_switch_2gang_physical/);
    assert.match(src, /button_wireless_switch_2gang_physical_gang1_on/);
  });

  it('gas_sensor_switch device.js does not invent double-switch IDs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/gas_sensor_switch/device.js'), 'utf8');
    assert.doesNotMatch(src, /gas_sensor_switch_switch_4gang/);
    const ids = flowIds('gas_sensor_switch');
    assert.ok(ids.has('gas_sensor_switch_4gang_physical_gang1_on'));
  });

  it('PhysicalButtonMixin stamps button token for Homey dropdown flows', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /button:\s*String\(tokens\.button\s*\|\|\s*gang\)/);
    assert.match(src, /\$\{driverId\}_\$\{gangCount\}gang_gang\$\{gang\}_scene/);
  });

  it('CoreCapabilityMixin is declared-only (no raw spray)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/CoreCapabilityMixin.js'), 'utf8');
    assert.doesNotMatch(src, /getDeviceTriggerCard\(tid\)/);
    assert.match(src, /collectDeclaredFlowIds|_safeTriggerFlow/);
  });

  it('scene_switch_4 / button_wireless_4 compose keep flow families', () => {
    const scene = flowIds('scene_switch_4');
    const bw4 = flowIds('button_wireless_4');
    assert.ok(scene.has('scene_switch_4_button_pressed'));
    assert.ok(scene.has('scene_switch_4_button_1_pressed'));
    assert.ok(bw4.has('button_wireless_4_button_4gang_button_1_pressed'));
    assert.ok(bw4.has('button_wireless_4_button_4gang_button_pressed'));
  });
});
