'use strict';
// P3065 flow uplift (a): declared-but-never-fired driver triggers.
// Static part: scripts/diag/flow-trigger-reach.js resolves literal, template (`${x}_suffix`),
// `<driver>_<suffix>` and capability-autowire ids. Orphans may only shrink.
// Runtime part: the 14 cards mapped in this step really fire through DeadFlowAutoWire
// when their capability changes, with tokens taken from the card, and never on the wrong value.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const reach = require('../../scripts/diag/flow-trigger-reach');
const W = require('../../lib/flow/DeadFlowAutoWire');

const ORPHAN_CEIL = 121; // 2026-10-26 after P3065 D8 (battery low); was 127, 128, 142

test('P3065 (a): orphan driver triggers do not grow', () => {
  assert.ok(reach.orphan.length <= ORPHAN_CEIL, `orphans grew to ${reach.orphan.length}`);
  assert.ok(reach.literal.length + reach.template.length > 3000, 'reach scan saw the card set');
});

const NEW = {
  climate_sensor_presence_sensor_climate_prese_a91ea: ['measure_luminance', 120],
  contact_sensor_curtain_motor_windowcoverings_f33e3: ['windowcoverings_set', 0.4],
  curtain_motor_shutter_curtain_motor_windowco_94ffa: ['windowcoverings_set', 0.4],
  curtain_motor_wall_curtain_motor_windowcover_ee1ea: ['windowcoverings_set', 0.4],
  device_air_purifier_presence_air_purifier_pr_f0929: ['measure_luminance', 120],
  gas_detector_gas_detected: ['alarm_gas', true],
  gas_detector_co_detected: ['alarm_co', true],
  sensor_lcdtemphumidsensor_soil_sensor_moistu_8517b: ['measure_humidity.soil', 41],
  sensor_lcdtemphumidsensor_soil_sensor_batter_d438e: ['measure_battery', 63],
  sensor_motion_radar_motion_sensor_radar_mmwa_494ef: ['measure_battery', 63],
  sensor_motion_radar_motion_sensor_radar_mmwa_ce6c1: ['measure_luminance', 120],
  universal_zigbee_contact_open: ['alarm_contact', true],
  universal_zigbee_motion_off: ['alarm_motion', false],
  wifi_door_lock_wifi_lock_locked: ['locked', true],
  wifi_door_lock_wifi_lock_unlocked: ['locked', false],
};

function fakeDevice(driverId) {
  const flow = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.flow.compose.json'), 'utf8'));
  const fired = [];
  return {
    fired,
    driver: { id: driverId },
    homey: { manifest: { flow: { triggers: flow.triggers } } },
    async triggerFlowCard(id, tokens, state) { fired.push({ id, tokens, state }); return true; },
  };
}

test('P3065 (a): newly mapped triggers fire at runtime on their capability, with card tokens', async () => {
  W._resetForTests();
  for (const [id, [cap, value]] of Object.entries(NEW)) {
    const driverId = W.loadMap().triggers[id] && W.loadMap().triggers[id].driver;
    assert.ok(driverId, `${id} not mapped`);
    const dev = fakeDevice(driverId);
    await W.fireMappedTriggers(dev, cap, value);
    const hit = dev.fired.find((f) => f.id === id);
    assert.ok(hit, `${id} did not fire on ${cap}=${value}`);
    const card = dev.homey.manifest.flow.triggers.find((t) => t.id === id);
    for (const t of card.tokens || []) {
      assert.strictEqual(typeof hit.tokens[t.name], t.type, `${id} token ${t.name}`);
    }
    if (typeof value === 'boolean') {
      const other = fakeDevice(driverId);
      await W.fireMappedTriggers(other, cap, !value);
      assert.ok(!other.fired.some((f) => f.id === id), `${id} fired on the wrong value`);
    }
  }
});

test('P3065 (a): every mapped trigger is declared on its driver and its driver has the capability', () => {
  const map = W.loadMap().triggers;
  for (const [id, v] of Object.entries(map)) {
    const flow = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', v.driver, 'driver.flow.compose.json'), 'utf8'));
    assert.ok((flow.triggers || []).some((t) => t.id === id), `${id} not declared on ${v.driver}`);
    const caps = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', v.driver, 'driver.compose.json'), 'utf8')).capabilities || [];
    assert.ok(caps.includes(v.cap), `${id}: ${v.driver} has no ${v.cap}`);
  }
});
