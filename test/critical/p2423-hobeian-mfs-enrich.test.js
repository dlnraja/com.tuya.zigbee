'use strict';

/**
 * P2423 — HOBEIAN mfs_db sacred-couple locks
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const mfs = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/mfs_db.json'), 'utf8'));

function entry(mfr) {
  const n = String(mfr).toLowerCase();
  const key = Object.keys(mfs).find((k) => k.toLowerCase() === n);
  return key ? mfs[key] : null;
}

function testBrandMultiCouple() {
  const brand = mfs.HOBEIAN || entry('HOBEIAN');
  assert.ok(brand, 'HOBEIAN brand entry');
  assert.strictEqual(brand.multiCouple, true);
  assert.ok(brand.byPid && typeof brand.byPid === 'object');
  assert.strictEqual(brand.byPid['ZG-204ZX'], 'presence_sensor_radar');
  assert.strictEqual(brand.byPid['ZG-302ZM'], 'presence_sensor_radar');
  assert.strictEqual(brand.byPid['ZG-102ZM'], 'vibration_sensor');
  assert.strictEqual(brand.byPid['ZG-103Z'], 'vibration_sensor');
  assert.strictEqual(brand.byPid['ZG-226Z'], 'water_leak_sensor');
  assert.strictEqual(brand.byPid['ZG-228Z'], 'vibration_sensor');
  assert.strictEqual(brand.byPid['ZG-303Z'], 'soil_sensor');
}

function testTzeLocks() {
  const locks = [
    ['_TZE200_vuqzj1ej', 'presence_sensor_radar', 'ZG-204ZH'],
    ['_TZE200_kccdzaeo', 'presence_sensor_radar', 'ZG-302ZM'],
    ['_TZE200_zbfmvj13', 'presence_sensor_radar', 'ZG-204ZK'],
    ['_TZE200_iba1ckek', 'vibration_sensor', 'ZG-103Z'],
    ['_TZE200_jfw0a4aa', 'vibration_sensor', 'ZG-102ZM'],
    ['_TZE200_2aaelwxk', 'presence_sensor_radar', 'ZG-204ZM'],
    ['_TZE200_wqashyqo', 'soil_sensor', 'ZG-303Z'],
  ];
  for (const [mfr, driverId, pid] of locks) {
    const e = entry(mfr);
    assert.ok(e, `missing mfs ${mfr}`);
    assert.strictEqual(e.driverId, driverId, `${mfr} driver`);
    assert.ok((e.modelIds || []).includes(pid), `${mfr} needs pid ${pid}`);
    assert.ok((e.modelIds || []).includes('TS0601'), `${mfr} needs TS0601`);
  }
}

function testComposeNoSteal() {
  const curtain = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../drivers/curtain_motor/driver.compose.json'), 'utf8'));
  const cm = (curtain.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
  assert.ok(!cm.includes('_tze200_zbfmvj13'), 'curtain must not steal ZG-204ZK mfr');

  const sw = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../drivers/switch_1gang/driver.compose.json'), 'utf8'));
  const sm = (sw.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
  assert.ok(!sm.includes('_tze200_iba1ckek'), 'switch_1gang must not steal ZG-103Z');
  assert.ok(!sm.includes('_tze200_afycb3cg'), 'switch_1gang must not steal ZG-103Z afycb3cg');
}

function testSyncSkipsMultiCouple() {
  const src = fs.readFileSync(
    path.join(__dirname, '../../tools/ci/sync-compose-to-mfs-db.js'), 'utf8');
  assert.ok(src.includes('multiCouple'), 'sync must protect multiCouple brands');
}

function main() {
  testBrandMultiCouple();
  testTzeLocks();
  testComposeNoSteal();
  testSyncSkipsMultiCouple();
  console.log('P2423 HOBEIAN mfs enrich gates OK');
}

main();
