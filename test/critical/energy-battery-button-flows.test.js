'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P205 energy / battery / button flows', () => {
  it('battery and energy writers prefer safeSetCapabilityValue', () => {
    assert.match(read('lib/managers/SmartBatteryManager.js'), /safeSetCapabilityValue/);
    assert.match(read('lib/managers/SmartBatteryManager.js'), /async _safeSet\(/);
    assert.match(read('lib/battery/UnifiedBatteryHandler.js'), /async _safeSetCap\(/);
    assert.match(read('lib/managers/SmartEnergyManager.js'), /safeSetCapabilityValue/);
    assert.match(read('lib/managers/VirtualEnergyManager.js'), /safeSetCapabilityValue/);
    assert.match(read('lib/utils/safe-capability.js'), /safeSetDeviceCapability/);
  });

  it('PhysicalButtonMixin fires app-level button_pressed fallback', () => {
    const src = read('lib/mixins/PhysicalButtonMixin.js');
    assert.match(src, /_triggerAppLevelButtonFlows/);
    assert.match(src, /button_pressed/);
    assert.match(src, /button_double_press/);
    assert.match(src, /button_long_press/);
  });

  it('VirtualButtonMixin records virtual_button_pressed', () => {
    const src = read('lib/mixins/VirtualButtonMixin.js');
    assert.match(src, /virtual_button_pressed/);
    assert.match(src, /_recordVirtualButtonEvent/);
  });

  it('homeycompose has battery % + virtual press + energy_power_above cards', () => {
    assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose/flow/conditions/battery_percent_below.json')));
    assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose/flow/triggers/battery_percent_changed.json')));
    assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose/flow/actions/virtual_press_button.json')));
    assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose/flow/conditions/energy_power_above.json')));
    const bp = JSON.parse(read('.homeycompose/flow/triggers/button_pressed.json'));
    assert.ok(!bp.titleFormatted || !JSON.stringify(bp.titleFormatted).includes('[[device]]'));
  });

  it('FeatureFlowCards registers battery_percent_below and virtual_press_button', () => {
    const src = read('lib/flow/FeatureFlowCards.js');
    assert.match(src, /battery_percent_below/);
    assert.match(src, /virtual_press_button/);
    assert.match(src, /energy_power_above/);
  });

  it('UnifiedSwitchBase wires VirtualEnergyMeterMixin', () => {
    const src = read('lib/devices/UnifiedSwitchBase.js');
    assert.match(src, /VirtualEnergyMeterMixin/);
    assert.match(src, /_initVirtualEnergy/);
    assert.match(src, /_cleanupVirtualEnergy/);
  });

  it('ensure-physical-flow-cards script dry-runs cleanly', () => {
    const r = spawnSync(process.execPath, ['tools/ci/ensure-physical-flow-cards.js', '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const j = JSON.parse(r.stdout);
    assert.equal(j.mode, 'dry-run');
    assert.ok(j.driversScanned > 100);
  });
});
