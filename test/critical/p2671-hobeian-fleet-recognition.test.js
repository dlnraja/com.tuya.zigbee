'use strict';

/**
 * P2671 — HOBEIAN fleet recognition Contre quoi
 * Fail if exact `HOBEIAN` form or verified Z2M pids drop from compose / FP DB / mfs.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));

const FORMS = ['HOBEIAN', 'Hobeian', 'hobeian', 'heobian', 'Heobian'];

const EXPECT = {
  switch_1gang: ['ZG-301Z', 'WHD02', 'ZG-302Z1'],
  switch_3gang: ['ZG-301Z-3CH', 'ZG-302Z3'],
  switch_2gang: ['ZG-305Z', 'ZG-301Z-2CH'],
  curtain_motor: ['ZG-301Z-MOTO'],
  climate_sensor: ['ZG-227Z', 'ZG-227ZL', 'ZG-227ZH', 'ZG-227ZP'],
  contact_sensor: ['ZG-102Z', 'ZG-102ZA'],
  presence_sensor_radar: ['ZG-204Z', 'ZG-210Z', 'AY-204ZX'],
  water_leak_sensor: ['ZG-222Z', 'AY222Z'],
  ir_blaster: ['ZG-IR01'],
  button_wireless_1: ['ZG-101ZL', 'ZG-101ZD'],
};

const FP_LOCKS = [
  ['HOBEIAN', 'ZG-301Z', 'switch_1gang'],
  ['HOBEIAN', 'ZG-301Z-3CH', 'switch_3gang'],
  ['HOBEIAN', 'ZG-301Z-MOTO', 'curtain_motor'],
  ['HOBEIAN', 'ZG-210Z', 'presence_sensor_radar'],
  ['HOBEIAN', 'ZG-IR01', 'ir_blaster'],
  ['HOBEIAN', 'WHD02', 'switch_1gang'],
  ['heobian', 'ZG-301Z', 'switch_1gang'],
  ['HOBEIAN', 'ZG-227ZH', 'climate_sensor'],
];

describe('P2671 HOBEIAN fleet recognition', () => {
  for (const [driverId, pids] of Object.entries(EXPECT)) {
    it(`${driverId} keeps HOBEIAN exact forms + Z2M pids`, () => {
      const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
      assert.ok(fs.existsSync(fp), `missing ${driverId}`);
      const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const mfr = j.zigbee?.manufacturerName || [];
      for (const form of FORMS) {
        assert.ok(mfr.includes(form), `${driverId} missing exact mfr form ${form}`);
      }
      const productIds = j.zigbee?.productId || [];
      for (const pid of pids) {
        assert.ok(productIds.includes(pid), `${driverId} missing pid ${pid}`);
      }
    });
  }

  it('DeviceFingerprintDB locks Z2M HOBEIAN couples', () => {
    for (const [m, p, exp] of FP_LOCKS) {
      const hit = DB.lookup(m, p);
      assert.ok(hit, `FP miss ${m}|${p}`);
      assert.equal(hit.driver, exp, `${m}|${p} → ${hit.driver} want ${exp}`);
    }
  });

  it('mfs_db has heobian + HOBEIAN with ZG-301Z-3CH / MOTO / IR01', () => {
    const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json')));
    for (const form of FORMS) {
      assert.ok(mfs[form], `mfs missing key ${form}`);
      assert.ok(Array.isArray(mfs[form].modelIds), `${form}.modelIds`);
    }
    const models = mfs.HOBEIAN.modelIds.map((x) => String(x).toUpperCase());
    for (const need of ['ZG-301Z-3CH', 'ZG-301Z-MOTO', 'ZG-IR01', 'ZG-210Z', 'ZG-227ZH']) {
      assert.ok(models.includes(need.toUpperCase()), `mfs missing ${need}`);
    }
  });

  it('presence_sensor_radar must NOT claim water ZG-222Z', () => {
    const j = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers', 'presence_sensor_radar', 'driver.compose.json'), 'utf8')
    );
    const pids = (j.zigbee?.productId || []).map((x) => String(x).toUpperCase());
    assert.ok(!pids.includes('ZG-222Z'), 'ZG-222Z belongs on water_leak_sensor');
  });
});
