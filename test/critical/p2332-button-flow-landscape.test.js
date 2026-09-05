'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
/**
 * P2332 — L99 button/scene/wireless FLOW CARD landscape leftovers
 * (hold-release declared-only, Tuya DP physical shadow, wall4g RX arm,
 *  Nobø xffhmvhv sacred couple, wall_switch_4_gang_tuya per-gang cards)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function flowIds(driverId) {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.flow.compose.json'), 'utf8'));
  const ids = new Set();
  for (const k of ['triggers', 'conditions', 'actions']) {
    for (const c of j[k] || []) if (c?.id) ids.add(c.id);
  }
  return ids;
}

describe('P2332 button flow landscape', () => {
  it('ButtonDevice hold-release uses _tryCard only (no raw getDeviceTriggerCard)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    const fn = src.match(/async _triggerHoldRelease\([\s\S]*?\n  \}/);
    assert.ok(fn, 'missing _triggerHoldRelease');
    assert.match(fn[0], /_tryCard/);
    const codeOnly = fn[0].replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(codeOnly, /getDeviceTriggerCard\s*\(/);
  });

  it('VirtualButtonMixin virtual_button_pressed prefers _safeTriggerFlow', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/VirtualButtonMixin.js'), 'utf8');
    assert.match(src, /WHY\(P2332\).*_safeTriggerFlow|declared-only[\s\S]{0,80}_safeTriggerFlow/s);
  });

  it('TuyaSpecificClusterDevice no longer raw-shadows PhysicalButtonMixin', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/TuyaSpecificClusterDevice.js'), 'utf8');
    assert.match(src, /TuyaZigbeeDevice\.prototype\._triggerPhysicalFlow\.call/);
    assert.match(src, /legacyBool|arguments\.length === 1/);
    assert.doesNotMatch(src, /getDeviceTriggerCard\(flowId\)/);
  });

  it('wall_switch_4_gang arms initPhysicalButtonDetection', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_switch_4_gang/device.js'), 'utf8');
    assert.match(src, /initPhysicalButtonDetection/);
    assert.match(src, /get gangCount\(\)/);
  });

  it('wall_switch_4_gang_tuya has physical_gang1–4 on/off cards', () => {
    const ids = flowIds('wall_switch_4_gang_tuya');
    for (let g = 1; g <= 4; g++) {
      assert.ok(ids.has(`wall_switch_4_gang_tuya_physical_gang${g}_on`), `missing gang${g}_on`);
      assert.ok(ids.has(`wall_switch_4_gang_tuya_physical_gang${g}_off`), `missing gang${g}_off`);
    }
  });

  it('xffhmvhv+TS004F locked to button_wireless_4 (MVM + misattribution)', () => {
    const mvm = fs.readFileSync(path.join(ROOT, 'lib/ManufacturerVariationManager.js'), 'utf8');
    assert.match(mvm, /xffhmvhv[\s\S]{0,120}button_wireless_4/);
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const entries = Array.isArray(reg) ? reg : (reg.cases || reg.entries || []);
    const hit = entries.find((e) => /xffhmvhv/i.test(JSON.stringify(e.mfr || e)));
    assert.ok(hit, 'missing misattribution entry');
    assert.strictEqual(hit.canonicalDriver, 'button_wireless_4');
  });

  it('PhysicalButtonMixin profile skip8004 for xffhmvhv', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /_TZ3000_xffhmvhv[\s\S]{0,200}skip8004:\s*true/);
  });
});
