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
