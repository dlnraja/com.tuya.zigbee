'use strict';
// P3065 D15 — the 19 legacy trigger ids that were undeclared on master (P3068 baseline) now go
// through safeFlowCard: the real card when the manifest declares the id, else a logged-once no-op.
// No card added (upload headroom), no id renamed, nothing fired that was not fired before.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { safeFlowCard } = require('../../lib/flow/FlowCardPresence');
const ROOT = path.join(__dirname, '../..');

const SITES = {
  'lib/battery/BatteryMonitoringMixin.js': ['battery_low'],
  'lib/battery/BatteryMonitoringSystem.js': ['low_battery_warning'],
  'lib/devices/BaseTuyaDPDevice.js': ['universal_battery_changed'],
  'lib/diagnostics/DeviceHealth.js': ['device_offline', 'device_online'],
  'lib/dynamic/SmartButtonRouter.js': ['scene_button_pressed'],
  'lib/flow/FlowTriggerHelpers.js': ['alarm_triggered', 'button_released', 'contact_closed', 'contact_opened',
    'device_offline', 'device_online', 'humidity_changed', 'motion_started', 'motion_stopped', 'presence_changed',
    'target_temperature_reached', 'temperature_changed'],
  'lib/zigbee/GreenPowerManager.js': ['green_power_action'],
};

test('no raw getDeviceTriggerCard call left for the legacy ids; each goes through safeFlowCard', () => {
  for (const [f, ids] of Object.entries(SITES)) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(/require\([^)]*FlowCardPresence/.test(s), `${f} requires FlowCardPresence`);
    for (const id of ids) {
      assert.ok(!new RegExp(`getDeviceTriggerCard\\(\\s*'${id}'\\s*\\)`).test(s), `${f} raw ${id}`);
      assert.ok(s.includes(`'getDeviceTriggerCard', '${id}')`), `${f} guarded ${id}`);
    }
  }
});

test('safeFlowCard: undeclared id -> no-op (no Homey call), declared id -> real card', async () => {
  let calls = 0;
  const real = { trigger: async () => true };
  const homey = {
    manifest: { flow: { triggers: [{ id: 'device_back_online' }], conditions: [], actions: [] } },
    flow: { getDeviceTriggerCard: (id) => { calls += 1; return id === 'device_back_online' ? real : null; } },
    app: { log() {} },
  };
  const noop = safeFlowCard(homey, 'getDeviceTriggerCard', 'device_online');
  assert.strictEqual(noop.__flowGuardNoop, true);
  assert.strictEqual(await noop.trigger({}, {}), false);
  assert.strictEqual(calls, 0);
  assert.strictEqual(safeFlowCard(homey, 'getDeviceTriggerCard', 'device_back_online'), real);
  assert.strictEqual(calls, 1);
});
