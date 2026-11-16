'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const sacred = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'));

// P3343: exact couples from the 2026-11-16 KB daily (Koenkk/zigbee-herdsman-converters f368dcd)
const COUPLES = [
  ['_TZE28C1000000_gxbdnfrh', 'TS0601', 'switch_wall_6gang'],
  ['_TZE28C1000000_uqfph8ah', 'TS0601', 'curtain_motor'],
  ['_TZE28C1000000_ntqql63p', 'TS0601', 'presence_sensor_radar'],
  ['_TZ3002_wowrpxxu', 'TS0726', 'switch_1gang'],
  ['_TZB210_azjhlyvy', 'TS0505B', 'light_bulb_rgb_rgbw'],
];

describe('P3343 KB daily 2026-11-16 couples', () => {
  for (const [mfr, pid, driverId] of COUPLES) {
    it(`${mfr}/${pid} has exactly one owner (${driverId}) and is pinned`, () => {
      const owners = app.drivers.filter((d) => ((d.zigbee || {}).manufacturerName || []).some((m) => m.toLowerCase() === mfr.toLowerCase()));
      assert.deepStrictEqual(owners.map((d) => d.id), [driverId]);
      assert.ok(owners[0].zigbee.productId.includes(pid));
      const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8'));
      assert.ok(compose.zigbee.manufacturerName.includes(mfr));
      assert.ok(sacred.couples.some((c) => c.mfr === mfr && c.pid === pid && c.driverId === driverId));
    });
  }
});
