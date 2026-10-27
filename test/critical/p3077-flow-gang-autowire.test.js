'use strict';

// P3077 flow audit: WiFi per-gang / per-socket / tank-full cards were declared but never fired.
const { test } = require('node:test');
const assert = require('node:assert');

const map = require('../../config/flow/dead-flow-autowire.json');
const W = require('../../lib/flow/DeadFlowAutoWire');

const EXPECTED = {
  wifi_switch_2gang_g1_on: ['wifi_switch_2gang', 'onoff', true],
  wifi_switch_2gang_g1_off: ['wifi_switch_2gang', 'onoff', false],
  wifi_switch_2gang_g2_on: ['wifi_switch_2gang', 'onoff.gang2', true],
  wifi_switch_2gang_g2_off: ['wifi_switch_2gang', 'onoff.gang2', false],
  wifi_power_strip_socket1_on: ['wifi_power_strip', 'onoff', true],
  wifi_power_strip_socket1_off: ['wifi_power_strip', 'onoff', false],
  wifi_dehumidifier_water_full: ['wifi_dehumidifier', 'alarm_water', true]
};

test('P3077 flow: the 7 orphan WiFi cards are mapped to their exact capability', () => {
  for (const [id, [driver, cap, when]] of Object.entries(EXPECTED)) {
    assert.deepStrictEqual(map.triggers[id], { driver, cap, when }, id);
  }
});

test('P3077 flow: gang 2 fires only on onoff.gang2, gang 1 only on onoff', () => {
  W._resetForTests();
  assert.deepStrictEqual(W.mappedTriggerIds('wifi_switch_2gang', 'onoff.gang2', true), ['wifi_switch_2gang_g2_on']);
  assert.deepStrictEqual(W.mappedTriggerIds('wifi_switch_2gang', 'onoff.gang2', false), ['wifi_switch_2gang_g2_off']);
  assert.deepStrictEqual(W.mappedTriggerIds('wifi_switch_2gang', 'onoff', true), ['wifi_switch_2gang_g1_on']);
  assert.deepStrictEqual(W.mappedTriggerIds('wifi_dehumidifier', 'alarm_water', false), []);
});

test('P3077 flow: Zigbee `switch` look-alike cards are not auto-wired (already reached)', () => {
  for (const id of Object.keys(map.triggers)) {
    assert.ok(!/^switch_2gang_gang\d_turned_(on|off)_switch$/.test(id), id);
  }
});

test('P3077 flow batch 2: radar distance + soil temperature orphans follow their capability, tokens in metres', () => {
  const fs = require('fs');
  const DIST = 'measure_luminance.distance';
  for (const [id, driver] of [
    ['climate_sensor_presence_sensor_climate_prese_469fa', 'climate_sensor_presence'],
    ['device_air_purifier_presence_air_purifier_pr_40c51', 'device_air_purifier_presence'],
    ['sensor_motion_radar_motion_sensor_radar_mmwa_4efe6', 'sensor_motion_radar'],
    ['sensor_motion_radar_motion_sensor_radar_mmwa_edf67', 'sensor_motion_radar']
  ]) {
    assert.deepStrictEqual(map.triggers[id], { driver, cap: DIST, when: 'change' }, id);
    const card = JSON.parse(fs.readFileSync(`drivers/${driver}/driver.flow.compose.json`, 'utf8')).triggers.find((t) => t.id === id);
    for (const tok of card.tokens || []) {assert.ok(!/\(cm\)/.test(JSON.stringify(tok.title)), `${id}: capability is in m`);}
  }
  assert.deepStrictEqual(map.triggers.sensor_lcdtemphumidsensor_soil_sensor_temper_b2371,
    { driver: 'sensor_lcdtemphumidsensor_soil', cap: 'measure_temperature', when: 'change' });
});

test('P3077 flow batch 3: siren stopped / WiFi alarm on-off follow alarm_generic (sounding state)', () => {
  const G = 'alarm_generic';
  assert.deepStrictEqual(map.triggers.siren_alarm_stopped, { driver: 'siren', cap: G, when: false });
  assert.deepStrictEqual(map.triggers.device_air_purifier_siren_alarm_stopped, { driver: 'device_air_purifier_siren', cap: G, when: false });
  assert.deepStrictEqual(map.triggers.wifi_siren_alarm_on, { driver: 'wifi_siren', cap: G, when: true });
  assert.deepStrictEqual(map.triggers.wifi_siren_alarm_off, { driver: 'wifi_siren', cap: G, when: false });
  // 'Siren started' keeps its existing path: not added to the map (no double fire)
  assert.strictEqual(map.triggers.siren_alarm_triggered, undefined);
  W._resetForTests();
  assert.deepStrictEqual(W.mappedTriggerIds('wifi_siren', G, true), ['wifi_siren_alarm_on']);
  assert.deepStrictEqual(W.mappedTriggerIds('wifi_siren', G, false), ['wifi_siren_alarm_off']);
  assert.deepStrictEqual(W.mappedTriggerIds('siren', G, true), []);
});

test('P3077 flow batch 4: shutter moving + vacuum cleaning follow their state capability; DIN-rail dehumidifier cards never fire', () => {
  const S = 'windowcoverings_state';
  const V = 'vacuumcleaner_state';
  assert.deepStrictEqual(map.triggers.shutter_roller_controller_started_moving, { driver: 'shutter_roller_controller', cap: S, when: 'leave:idle' });
  assert.deepStrictEqual(map.triggers.shutter_roller_controller_stopped_moving, { driver: 'shutter_roller_controller', cap: S, when: 'enter:idle' });
  assert.deepStrictEqual(map.triggers.wifi_robot_vacuum_cleaning_started, { driver: 'wifi_robot_vacuum', cap: V, when: 'enter:cleaning' });
  assert.deepStrictEqual(map.triggers.wifi_robot_vacuum_cleaning_finished, { driver: 'wifi_robot_vacuum', cap: V, when: 'move:cleaning>docked' });
  W._resetForTests();
  const sh = (v, p) => W.mappedTriggerIds('shutter_roller_controller', S, v, { previous: p });
  assert.deepStrictEqual(sh('down', 'idle'), ['shutter_roller_controller_started_moving']);
  assert.deepStrictEqual(sh('idle', 'up'), ['shutter_roller_controller_stopped_moving']);
  assert.deepStrictEqual(sh('idle', null), [], 'first report after start never fires');
  const vac = (v, p) => W.mappedTriggerIds('wifi_robot_vacuum', V, v, { previous: p });
  assert.deepStrictEqual(vac('cleaning', 'docked'), ['wifi_robot_vacuum_cleaning_started']);
  assert.deepStrictEqual(vac('docked', 'cleaning'), ['wifi_robot_vacuum_cleaning_finished']);
  assert.deepStrictEqual(vac('stopped', 'cleaning'), [], 'a pause is not a finished cycle');
  assert.strictEqual(W.modeEdge('move:a>b', 'b', 'c'), false);
  const { NEVER_FIRE_IDS } = require('../../tools/flow/build-dead-flow-autowire.js');
  assert.strictEqual(NEVER_FIRE_IDS.size, 8);
  for (const id of NEVER_FIRE_IDS) {assert.strictEqual(map.triggers[id], undefined, id);}
  assert.ok(map.triggers.device_din_rail_meter_hvac_dehumidifier_powe_f9a4b, 'DIN-rail power card keeps its mapping');
});
