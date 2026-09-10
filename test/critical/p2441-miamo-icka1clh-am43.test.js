'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');
const has = (list, v) => (list || []).some((x) => String(x).toLowerCase() === v.toLowerCase());

describe('P2441/P2445 MIAMO AM43 icka1clh+zah67ekd multi-pid → curtain_motor', () => {
  it('compose locks AM43 mfrs on curtain_motor not shutter/tilt', () => {
    const motor = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
    const shutter = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor_shutter/driver.compose.json'), 'utf8'));
    const tilt = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor_tilt/driver.compose.json'), 'utf8'));
    for (const mfr of ['_TZE200_icka1clh', '_TZE204_icka1clh', '_TZE200_zah67ekd']) {
      assert.ok(has(motor.zigbee.manufacturerName, mfr), mfr);
      assert.ok(!has(shutter.zigbee.manufacturerName, mfr), `shutter must not claim ${mfr}`);
      assert.ok(!has(tilt.zigbee.manufacturerName, mfr), `tilt must not claim ${mfr}`);
    }
    // Multi-pid / retail variants OK on same mfr driver
    for (const pid of ['TS0601', 'AM43-0.45/40-ES-EB', 'AM43-0.45/40-ES-EZ']) {
      assert.ok(has(motor.zigbee.productId, pid), pid);
    }
  });

  it('mfs_db keeps multiple verified modelIds on curtain_motor (no invent TS0301)', () => {
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
    const mfs = db.manufacturers || db;
    for (const mfr of ['_TZE200_icka1clh', '_TZE200_zah67ekd']) {
      const e = mfs[mfr];
      assert.ok(e, mfr);
      assert.strictEqual(e.driverId, 'curtain_motor');
      assert.ok((e.modelIds || []).includes('TS0601'));
      assert.ok((e.modelIds || []).includes('AM43-0.45/40-ES-EB'));
      assert.ok(!(e.modelIds || []).includes('TS0301'));
      assert.ok(!(e.modelIds || []).includes('TS0726'));
    }
  });

  it('device treats icka1clh as battery tubular / AM43 family', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/device.js'), 'utf8');
    assert.ok(src.includes('icka1clh'));
    assert.ok(src.includes('zah67ekd'));
    assert.ok(src.includes('P2441'));
  });

  it('registry forbids shutter+tilt for multi-pid AM43 couples', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const row = (reg.cases || []).find((c) => c.id === 'p2441-miamo-icka1clh-am43-curtain');
    assert.ok(row);
    assert.strictEqual(row.canonicalDriver, 'curtain_motor');
    assert.ok((row.forbiddenDrivers || []).includes('curtain_motor_shutter'));
    assert.ok((row.forbiddenDrivers || []).includes('curtain_motor_tilt'));
    assert.ok((row.productId || []).includes('TS0601'));
    assert.ok((row.productId || []).includes('AM43-0.45/40-ES-EB'));
    assert.ok((row.mfr || []).some((m) => /zah67ekd/i.test(m)));
  });
});
