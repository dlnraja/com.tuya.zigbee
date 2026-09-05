'use strict';

/**
 * P2421 — HOBEIAN Z2M DP / sacred-couple enrich gates
 * WHY: ZG-204ZM DP map must match herdsman; ZH/302ZM/ZL must not route to climate/vibration.
 */

const assert = require('assert');
const path = require('path');

const configs = require('../../drivers/presence_sensor_radar/configs');
const { getSensorConfig } = configs;

function testZg204ZmCanonical() {
  const cfg = getSensorConfig('HOBEIAN', 'ZG-204ZM');
  assert.strictEqual(cfg.configName, 'HOBEIAN_ZG204ZM');
  assert.strictEqual(cfg.dpMap[2].setting, 'static_detection_sensitivity');
  assert.strictEqual(cfg.dpMap[4].setting, 'static_detection_distance');
  assert.strictEqual(cfg.dpMap[4].divisor, 100);
  assert.strictEqual(cfg.dpMap[101].type, 'motion_state_enum');
  assert.strictEqual(cfg.dpMap[106].cap, 'measure_luminance');
  assert.strictEqual(cfg.dpMap[121].cap, 'measure_battery');
  // Must NOT invent old large_motion / DP3 distance mapping
  assert.ok(!cfg.dpMap[3], 'ZG-204ZM must not map DP3 (Z2M commented/unused)');
  assert.ok(!cfg.mainsPowered, 'ZG-204ZM is battery');
}

function testZg204Zh() {
  const cfg = getSensorConfig('_TZE200_vuqzj1ej', 'TS0601');
  assert.strictEqual(cfg.configName, 'HOBEIAN_ZG204ZH');
  assert.strictEqual(cfg.dpMap[111].cap, 'measure_temperature');
  assert.strictEqual(cfg.dpMap[101].cap, 'measure_humidity');
  assert.strictEqual(cfg.dpMap[103].type, 'motion_state_enum');
}

function testZg302Zm() {
  const cfg = getSensorConfig('_TZE200_kccdzaeo', 'ZG-302ZM');
  assert.strictEqual(cfg.configName, 'HOBEIAN_ZG302ZM');
  assert.strictEqual(cfg.hasRelay, true);
  assert.strictEqual(cfg.dpMap[101].cap, 'onoff');
  assert.strictEqual(cfg.dpMap[1].cap, 'alarm_motion');
  assert.ok(cfg.mainsPowered);
}

function testZg302Zl() {
  const cfg = getSensorConfig('_TZE200_khzbklyh', 'ZG-302ZL');
  assert.strictEqual(cfg.configName, 'HOBEIAN_ZG302ZL');
  assert.strictEqual(cfg.dpMap[101].cap, 'alarm_motion');
  assert.strictEqual(cfg.dpMap[1].cap, 'onoff');
}

function testYflzeeqjNotClimateFallback() {
  const cfg = getSensorConfig('_TZE200_yflzeeqj', 'TS0601');
  assert.strictEqual(cfg.configName, 'HOBEIAN_ZG204ZM');
}

function testComposeLocks() {
  const fs = require('fs');
  const presence = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
  const climate = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../drivers/climate_sensor/driver.compose.json'), 'utf8'));
  const vib = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../drivers/vibration_sensor/driver.compose.json'), 'utf8'));
  const clamp = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../drivers/power_clamp_meter/driver.compose.json'), 'utf8'));

  const pm = presence.zigbee.manufacturerName.map((m) => String(m).toLowerCase());
  assert.ok(pm.some((m) => m.includes('vuqzj1ej')), 'presence must lock vuqzj1ej');
  assert.ok(pm.some((m) => m.includes('kccdzaeo')), 'presence must lock kccdzaeo');
  assert.ok(pm.some((m) => m.includes('khzbklyh')), 'presence must lock khzbklyh');

  const cm = climate.zigbee.manufacturerName.map((m) => String(m).toLowerCase());
  assert.ok(!cm.some((m) => m.includes('vuqzj1ej')), 'climate must not own vuqzj1ej');
  assert.ok(!cm.some((m) => m.includes('yflzeeqj')), 'climate must not own yflzeeqj');

  const vm = vib.zigbee.manufacturerName.map((m) => String(m).toLowerCase());
  assert.ok(!vm.some((m) => m.includes('kccdzaeo')), 'vibration must not own kccdzaeo');
  assert.ok(!vm.some((m) => m.includes('khzbklyh')), 'vibration must not own khzbklyh');

  const cp = (clamp.zigbee.productId || []).map((p) => String(p).toUpperCase());
  assert.ok(!cp.includes('ZG-204ZM'), 'power_clamp must not cartesian ZG-204ZM');
  assert.ok(!cp.includes('ZG-302ZM'), 'power_clamp must not cartesian ZG-302ZM');
}

function main() {
  testZg204ZmCanonical();
  testZg204Zh();
  testZg302Zm();
  testZg302Zl();
  testYflzeeqjNotClimateFallback();
  testComposeLocks();
  console.log('P2421 HOBEIAN enrich gates OK');
}

main();
