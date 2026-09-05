'use strict';

/**
 * P2422 — Full HOBEIAN fleet enrich gates
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { getSensorConfig } = require('../../drivers/presence_sensor_radar/configs');

function testRadarRoutes() {
  assert.strictEqual(getSensorConfig('_TZE200_zbfmvj13', 'TS0601').configName, 'HOBEIAN_ZG204ZK');
  assert.strictEqual(getSensorConfig('HOBEIAN', 'ZG-204ZE').configName, 'HOBEIAN_ZG204ZE');
  assert.strictEqual(getSensorConfig('_TZE200_p9zbdqgs', 'ZG-204ZQ').configName, 'HOBEIAN_ZG204ZQ');
  assert.strictEqual(getSensorConfig('_TZE200_w0ap83qu', 'ZG-204ZX').configName, 'HOBEIAN_ZG204ZX');
  assert.strictEqual(getSensorConfig('HOBEIAN', 'ZG-204ZK').dpMap[122].setting, 'anti_interference');
  assert.strictEqual(getSensorConfig('HOBEIAN', 'ZG-204ZE').dpMap[106].cap, 'measure_luminance');
}

function testVibrationCompose() {
  const vib = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../drivers/vibration_sensor/driver.compose.json'), 'utf8'));
  const caps = vib.capabilities || [];
  assert.ok(caps.includes('alarm_contact'), 'vibration needs alarm_contact for ZG-102ZM');
  const mfrs = vib.zigbee.manufacturerName.map((m) => String(m).toLowerCase());
  assert.ok(mfrs.some((m) => m.includes('iba1ckek')), 'ZG-103Z mfr locked');
  assert.ok((vib.zigbee.productId || []).includes('ZG-228Z'), 'ZG-228Z pid');
}

function testCartesianStrip() {
  const illum = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../drivers/sensor_illuminance_presence/driver.compose.json'), 'utf8'));
  const pids = (illum.zigbee.productId || []).map((p) => String(p).toUpperCase());
  assert.ok(!pids.includes('ZG-102ZM'), 'illuminance must not steal ZG-102ZM');
  assert.ok(!pids.includes('ZG-103Z'), 'illuminance must not steal ZG-103Z');

  const plug = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../drivers/button_wireless_plug/driver.compose.json'), 'utf8'));
  const pp = (plug.zigbee.productId || []).map((p) => String(p).toUpperCase());
  assert.ok(!pp.includes('ZG-227Z'), 'wireless plug must not cartesian ZG-227Z');
}

function testWater226() {
  const water = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../drivers/water_leak_sensor/driver.compose.json'), 'utf8'));
  assert.ok((water.zigbee.productId || []).includes('ZG-226Z'));
}

function main() {
  testRadarRoutes();
  testVibrationCompose();
  testCartesianStrip();
  testWater226();
  // Keep P2421 gates green
  require('./p2421-hobeian-z2m-enrich.test.js');
  console.log('P2422 HOBEIAN full enrich gates OK');
}

main();
