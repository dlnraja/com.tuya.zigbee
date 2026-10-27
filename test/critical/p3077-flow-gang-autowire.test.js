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
