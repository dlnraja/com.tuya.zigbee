'use strict';
// P3295: `_TZ3000_bjawzodf` / TS0201 + TY0201 (Z2M tuya.ts WSD500A "Temperature & humidity sensor",
// ZHA #2862, HACF #38762) and `_TZE200_bjawzodf` / TS0601 (Z2M TS0601_temperature_humidity_sensor_1)
// are temperature/humidity sensors. The app manifests already route them to lcdtemphumidsensor /
// climate_sensor, but the driver-mapping index still recommended `air_purifier` (fan class, onoff), the
// "paired as a switch" report (Wilhelm Dall, 17/10). Every recommendation must now name the manifest driver.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const DBS = ['data/driver-mapping-database.json', 'driver-mapping-database.json'].filter((p) => fs.existsSync(path.join(ROOT, p)));

function manifestDriver(mfr, pid) {
  const hit = app.drivers.filter((d) => (d.zigbee?.manufacturerName || []).some((m) => m.toLowerCase() === mfr.toLowerCase())
    && (d.zigbee?.productId || []).some((p) => p.toLowerCase() === pid.toLowerCase()));
  return hit.map((d) => d.id);
}

const CASES = [['_TZ3000_bjawzodf', 'TS0201'], ['_TZ3000_bjawzodf', 'TY0201'], ['_TZE200_bjawzodf', 'TS0601']];

describe('P3295 bjawzodf temp/humidity sensors are never recommended a fan/switch driver', () => {
  for (const [mfr, pid] of CASES) {
    it(`${mfr} / ${pid}: the manifest has exactly one driver and it is a sensor`, () => {
      const ids = manifestDriver(mfr, pid);
      assert.strictEqual(ids.length, 1, `${mfr}|${pid} -> ${ids}`);
      assert.strictEqual(app.drivers.find((d) => d.id === ids[0]).class, 'sensor');
    });
    it(`${mfr} / ${pid}: DriverMappingLoader recommends the manifest driver`, () => {
      // The loader defers its JSON load under heap pressure (P2674), which the full suite can reach;
      // the lookup is exercised on the real shipped file, loaded here without that gate.
      const L = require(path.join(ROOT, 'lib/utils/DriverMappingLoader'));
      const Cls = typeof L === 'function' ? L : L.DriverMappingLoader;
      const loader = new Cls({ skipLoad: true });
      const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/driver-mapping-database.json'), 'utf8'));
      db.devices = db.devices || db.drivers || {}; db.parsers = db.parsers || {}; db.driver_rules = db.driver_rules || {};
      loader.database = db; loader.loaded = true;
      assert.strictEqual(loader.getRecommendedDriver(pid, mfr), manifestDriver(mfr, pid)[0]);
    });
  }
  for (const rel of DBS) {
    it(`${rel}: every bjawzodf mfr_index row names only the sensor driver`, () => {
      const db = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
      const rows = Object.entries(db.mfr_index).filter(([k]) => /bjawzodf/i.test(k));
      assert.ok(rows.length > 0);
      for (const [k, v] of rows) {
        const want = /^_tz3000_/i.test(k) ? 'lcdtemphumidsensor' : 'climate_sensor';
        assert.deepStrictEqual(v, [want], `${rel} ${k}`);
      }
    });
  }
});
