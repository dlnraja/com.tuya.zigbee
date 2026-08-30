'use strict';
/**
 * P2331 — deeper button↔flow card hygiene (after P2330)
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

describe('P2331 button flow deep hygiene', () => {
  it('fingerbot compose has no hashed physi_/power_ trigger IDs', () => {
    const ids = [...flowIds('button_wireless_fingerbot')];
    assert.ok(!ids.some((id) => /physi_[a-f0-9]{5}$|power_[a-f0-9]{5}$/i.test(id)));
    assert.ok(ids.includes('button_wireless_fingerbot_switch_1gang_physical_off'));
    assert.ok(ids.includes('button_wireless_fingerbot_switch_1gang_physical_single'));
    assert.ok(ids.includes('button_wireless_fingerbot_switch_1gang_power_changed'));
  });

  it('fingerbot/contact/air_purifier driver.js trigger lists match compose', () => {
    for (const d of ['button_wireless_fingerbot', 'contact_sensor_switch', 'air_purifier_switch']) {
      const src = fs.readFileSync(path.join(ROOT, `drivers/${d}/driver.js`), 'utf8');
      const m = src.match(/_triggerIds\s*=\s*\[([^\]]+)\]|const triggers\s*=\s*\[([^\]]+)\]/s);
      assert.ok(m, `${d} missing trigger list`);
      const blob = m[1] || m[2];
      assert.doesNotMatch(blob, /_switch_switch_/);
      assert.doesNotMatch(blob, /fingerbot_fingerbot_switch_switch/);
    }
  });

  it('PhysicalButtonMixin treats on/off as switch physical (not remote button_pressed)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /useRemoteButtonCards/);
    assert.match(src, /isOnOffPress/);
    assert.match(src, /_switch_1gang_physical_/);
  });

  it('UnifiedSwitchBase no longer raw-sprays _gangN_turned_', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSwitchBase.js'), 'utf8');
    assert.doesNotMatch(src, /getDeviceTriggerCard\(triggerId\)/);
    assert.match(src, /_triggerGangFlows|_safeTriggerFlow/);
  });

  it('wall_switch_4_gang declares physical_gang1..4', () => {
    const ids = flowIds('wall_switch_4_gang');
    for (let g = 1; g <= 4; g++) {
      assert.ok(ids.has(`wall_switch_4_gang_physical_gang${g}_on`), `missing gang${g}_on`);
      assert.ok(ids.has(`wall_switch_4_gang_physical_gang${g}_off`), `missing gang${g}_off`);
    }
  });

  it('button_wireless_4 fallback does not invent button_4gang_button_release', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_4/device.js'), 'utf8');
    assert.doesNotMatch(src, /button_4gang_\$\{suffix\}/);
    assert.match(src, /button_4gang_button_\$\{btn\}_release/);
  });
});
