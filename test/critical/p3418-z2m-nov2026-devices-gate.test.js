'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');

const ROOT = path.resolve(__dirname, '../..');

describe('P3418 Z2M/ZHC Nov 2026 new Tuya devices gate', () => {
  const cases = [
    ['air_quality_co2', '_TZE204_vw5ufrvc', 'TS0601'],
    ['energy_meter_3phase', '_TZE284_73llxjvf', 'TS0601'],
    ['switch_1gang', '_TZ3000_djhsq2ff', 'TS0001'],
    ['switch_3gang', '_TZ3000_3hjasqun', 'TS0003'],
  ];

  for (const [driver, mfr, pid] of cases) {
    it(`${driver} includes ${mfr} (${pid}) with lowercase variant`, () => {
      const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driver, 'driver.compose.json'), 'utf8'));
      assert.ok(c.zigbee.productId.includes(pid), `${driver} missing ${pid}`);
      assert.ok(c.zigbee.manufacturerName.includes(mfr), `${driver} missing ${mfr}`);
      assert.ok(c.zigbee.manufacturerName.includes(mfr.toLowerCase()), `${driver} missing ${mfr.toLowerCase()}`);
    });
  }
});
