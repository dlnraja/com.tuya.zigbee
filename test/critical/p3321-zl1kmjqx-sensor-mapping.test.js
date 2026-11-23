'use strict';
// P3321: `_TZE200_zl1kmjqx` / TS0601 is a Tuya temperature & humidity sensor
// (Z2M tuya.ts model TS0601_temperature_humidity_sensor_1; ZHA tuya_sensor.py;
// deCONZ Tuya multi sensor; couple-driver-pins and the app manifest already
// own it on lcdtemphumidsensor_3). The driver-mapping index still recommended
// `air_purifier` (fan class, onoff). Move only this exact couple's index rows
// to the manifest driver; do not invent ids or drop real couples.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const DBS = ['data/driver-mapping-database.json', 'driver-mapping-database.json']
  .filter((p) => fs.existsSync(path.join(ROOT, p)));

function manifestDriver(mfr, pid) {
  const hit = app.drivers.filter((d) => (d.zigbee?.manufacturerName || []).some((m) => m.toLowerCase() === mfr.toLowerCase())
    && (d.zigbee?.productId || []).some((p) => p.toLowerCase() === pid.toLowerCase()));
  return hit.map((d) => d.id);
}

const CASES = [['_TZE200_zl1kmjqx', 'TS0601']];
const WANT = 'lcdtemphumidsensor_3';

describe('P3321 _TZE200_zl1kmjqx is never recommended an air purifier driver', () => {
  for (const [mfr, pid] of CASES) {
    it(`${mfr} / ${pid}: the manifest has exactly one driver and it is the sensor`, () => {
      const ids = manifestDriver(mfr, pid);
      assert.deepStrictEqual(ids, [WANT], `${mfr}|${pid} -> ${ids}`);
      assert.strictEqual(app.drivers.find((d) => d.id === ids[0]).class, 'sensor');
    });
    it(`${mfr} / ${pid}: DriverMappingLoader recommends the manifest driver`, () => {
      const L = require(path.join(ROOT, 'lib/utils/DriverMappingLoader'));
      const Cls = typeof L === 'function' ? L : L.DriverMappingLoader;
      const loader = new Cls({ skipLoad: true });
      const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/driver-mapping-database.json'), 'utf8'));
      db.devices = db.devices || db.drivers || {}; db.parsers = db.parsers || {}; db.driver_rules = db.driver_rules || {};
      loader.database = db; loader.loaded = true;
      assert.strictEqual(loader.getRecommendedDriver(pid, mfr), WANT);
    });
  }
  for (const rel of DBS) {
    it(`${rel}: every _TZE200_zl1kmjqx mfr_index row names only ${WANT}`, () => {
      const db = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
      const rows = Object.entries(db.mfr_index).filter(([k]) => /^_tze200_zl1kmjqx$/i.test(k));
      assert.ok(rows.length > 0, 'expected at least one TZE200_zl1kmjqx mfr_index row');
      for (const [k, v] of rows) {
        assert.deepStrictEqual(v, [WANT], `${rel} ${k} -> ${JSON.stringify(v)}`);
        assert.ok(!v.some((d) => /air_purif/i.test(d)), `${rel} ${k} still lists an air purifier`);
      }
    });
  }
});
