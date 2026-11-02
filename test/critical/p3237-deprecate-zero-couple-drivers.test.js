'use strict';
// P3237: drivers with no real couple are deprecated (id kept, never deleted). Only drivers whose every
// sourced couple (data/mfs_db.json sacredCouples) is already owned by another driver compose qualify.
// Skipped on purpose (orphan sourced couples only attributed to them): doorwindowsensor, doorwindowsensor_2,
// remote_button_wireless_smart, device_plug_smart.
require('../_support/homey-stub');
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const j = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const DEPRECATED = ['device_plug_energy_monitor', 'sensor_lcdtemphumidsensor_temphumidsensor'];

describe('P3237 deprecate zero-couple drivers', () => {
  const own = new Map();
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const f = path.join(ROOT, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    const z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {};
    for (const m of z.manufacturerName || []) {for (const p of z.productId || []) {own.set(`${m}|${p}`.toLowerCase(), d);}}
  }
  for (const id of DEPRECATED) {
    it(`${id} kept (id, folder, app.json) and deprecated`, () => {
      assert.strictEqual(j(`drivers/${id}/driver.compose.json`).deprecated, true);
      const a = j('app.json').drivers.find((d) => d.id === id);
      assert.ok(a && a.deprecated === true);
      assert.ok(fs.existsSync(path.join(ROOT, 'drivers', id, 'device.js')));
    });
    it(`${id} has no real couple of its own (sourced couples owned elsewhere)`, () => {
      const z = j(`drivers/${id}/driver.compose.json`).zigbee || {};
      assert.ok((z.manufacturerName || []).every((m) => /needs_device_assignment|dummy/i.test(m)));
      const sc = (j('data/mfs_db.json').sacredCouples) || {};
      for (const [k, v] of Object.entries(sc)) {
        if ((v.driver || v.driverId) !== id) {continue;}
        const mf = v.mfr || k.split('|')[0];
        for (const p of (v.pid ? [v.pid] : v.productIds || [])) {
          const kk = `${mf}|${p}`.toLowerCase();
          if (/hybrid|dummy/.test(kk)) {continue;}
          assert.ok(own.has(kk) && own.get(kk) !== id, `orphan sourced couple ${kk}`);
        }
      }
    });
  }
});
