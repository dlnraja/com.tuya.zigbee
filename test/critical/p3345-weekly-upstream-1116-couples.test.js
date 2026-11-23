'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const sacred = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'));
const evidence = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/couple-removal-evidence.json'), 'utf8'));

// P3345: weekly upstream safety net 2026-11-16 (Koenkk/zigbee-herdsman-converters c18c32d..f368dcd)
const ADDED = [
  ['_TZ3000_g5pzotdr', 'TS0001', 'switch_1gang'],
  ['_TZ3210_aracgljk', 'TS0003', 'switch_3gang'],
  ['_TZ3210_xfbmf71h', 'TS0003', 'switch_3gang'],
  ['_TZD200_7khnomgh', 'TS0601', 'soil_sensor'],
  ['_TZD200_gt1gge3x', 'TS0601', 'rain_sensor'],
  ['_TZE2841000000_nlrfgpny', 'TS0601', 'siren'],
  ['_TZE284_1iii6x0y', 'TS0601', 'switch_wall_6gang'],
  ['_TZE204_bb5xlia1', 'TS0601', 'switch_wall_6gang'],
  ['_TZE204_tayx2ud6', 'TS0601', 'wall_switch_4_gang_tuya'],
  ['_TZE28C1000000_lbhh5o6z', 'TS0601', 'wall_switch_4_gang_tuya'],
  ['_TZE204_0corc0ph', 'TS0601', 'gas_sensor'],
  ['_TZE204_mqij5jas', 'TS0601', 'gas_sensor'],
  ['_TZE284_lqhqj73n', 'TS0601', 'curtain_motor_2'],
  ['_TZE284_pfbtmgo1', 'TS0601', 'water_leak_sensor'],
  ['_TZE200_7sa1ogeny', 'TS0601', 'soil_sensor'],
  ['_TZD200_7sa1ogeny', 'TS0601', 'soil_sensor'],
  ['_TZE200_sa1ogeny', 'TS0601', 'soil_sensor'],
  ['_TZD200_sa1ogeny', 'TS0601', 'soil_sensor'],
  ['_TZ3210_3632cjza', 'TS0502B', 'light_cct_ts0502b'],
];
// Wrong-class moves (exact couple, evidence recorded in data/couple-removal-evidence.json)
const MOVED = [
  ['_TZ3002_l8bfzlcd', 'TS0726', 'switch_4gang', 'switch_1gang'],
  ['_TZE284_1di7ujzp', 'TS0601', 'climate_sensor', 'water_leak_sensor'],
  ['_TZE204_lbhh5o6z', 'TS0601', 'curtain_motor', 'wall_switch_4_gang_tuya'],
  ['_TZE284_lbhh5o6z', 'TS0601', 'curtain_motor', 'wall_switch_4_gang_tuya'],
  ['_TZE204_iik0pquw', 'TS0601', 'curtain_motor', 'wall_switch_4_gang_tuya'],
];

const owners = (mfr) => app.drivers.filter((d) => ((d.zigbee || {}).manufacturerName || []).some((m) => m.toLowerCase() === mfr.toLowerCase()));
const compose = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));

describe('P3345 weekly upstream 2026-11-16 couples', () => {
  for (const [mfr, pid, driverId] of ADDED.concat(MOVED.map(([m, p, , dst]) => [m, p, dst]))) {
    it(`${mfr}/${pid} has exactly one owner (${driverId}) and is pinned`, () => {
      const own = owners(mfr);
      assert.deepStrictEqual(own.map((d) => d.id), [driverId]);
      assert.ok(own[0].zigbee.productId.includes(pid));
      assert.ok(compose(driverId).zigbee.manufacturerName.includes(mfr));
      assert.ok(sacred.couples.some((c) => c.mfr === mfr && c.pid === pid && c.driverId === driverId));
    });
  }
  for (const [mfr, pid, src] of MOVED) {
    it(`${mfr}/${pid} left ${src} with recorded evidence`, () => {
      assert.ok(!compose(src).zigbee.manufacturerName.some((m) => m.toLowerCase() === mfr.toLowerCase()));
      assert.ok((evidence.entries || []).some((e) => e.couple === `${mfr}|${pid}` && e.driver === src));
    });
  }
  it('HYSYIOT ZG-204ZX / ZG-204ZV whitelabels resolve to their HOBEIAN DP profiles (profiles ready, couples parked by the parasite budget)', () => {
    const { getSensorConfig } = require('../../drivers/presence_sensor_radar/configs.js');
    assert.strictEqual(getSensorConfig('_TZD200_5ziwcyoe', 'TS0601').configName, 'HOBEIAN_ZG204ZX');
    assert.strictEqual(getSensorConfig('_TZD200_vfh3tuo1', 'TS0202').configName, 'ZG_204ZV_MULTISENSOR');
  });
  it('Nous E13 DP101 alarm mode is not mapped to alarm_water', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/water_leak_sensor/device.js'), 'utf8');
    const i = src.indexOf('_tze284_pfbtmgo1');
    assert.ok(i > 0);
    const block = src.slice(i, src.indexOf('};', i));
    assert.ok(!/101: \{ capability: 'alarm_water'/.test(block));
    assert.match(block, /102: \{ capability: 'alarm_water'/);
  });
  it('HYSYIOT HS303Z uses the ZG-303Z soil DP map', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/soil_sensor/device.js'), 'utf8');
    assert.ok(src.includes("'_tzd200_7khnomgh'"));
  });
});
