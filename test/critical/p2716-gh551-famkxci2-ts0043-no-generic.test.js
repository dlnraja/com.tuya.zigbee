'use strict';

/**
 * P2716 — GH#551 migueleap residual (_TZ3000_famkxci2+TS0043 → Generic Zigbee)
 *
 * Contre quoi:
 * - mfs_db invents TS0013/TS0601/TS0215A for famkxci2 (interview is TS0043 only)
 * - compact drops exact `_TZ3000_famkxci2` case → Homey case-sensitive Generic
 * - EP1 clusters must stay interview [0,1,6,57344] (no IAS/EF00)
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2716 GH#551 famkxci2+TS0043 no Generic', () => {
  it('mfs_db locks famkxci2 to TS0043 only (no invent pids)', () => {
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
    const keys = Object.keys(db).filter((k) => /famkxci2/i.test(k));
    assert.ok(keys.length >= 1, 'famkxci2 in mfs_db');
    for (const k of keys) {
      const e = db[k];
      assert.equal(e.driverId, 'button_wireless_3', k);
      assert.deepEqual(e.modelIds, ['TS0043'], `${k} modelIds`);
      assert.equal(String(e.pid).toUpperCase(), 'TS0043', `${k} pid`);
      assert.ok(!(e.modelIds || []).includes('TS0601'));
      assert.ok(!(e.modelIds || []).includes('TS0013'));
    }
    assert.ok(db['_TZ3000_famkxci2'], 'exact interview case key');
  });

  it('compose front-pins exact case + interview EP1 + Spanish Universal Tuya learnmode', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8'),
    );
    assert.equal(compose.zigbee.manufacturerName[0], '_TZ3000_famkxci2');
    assert.ok(compose.zigbee.productId.includes('TS0043'));
    const ep1 = compose.zigbee.endpoints['1'].clusters.slice().sort((a, b) => a - b);
    assert.deepEqual(ep1, [0, 1, 6, 57344]);
    const es = compose.zigbee.learnmode?.instruction?.es || '';
    assert.match(es, /Universal Tuya/i);
    assert.match(es, /NO Zigbee|no Zigbee|genérico/i);
  });

  it('post-compact still has exact _TZ3000_famkxci2 + TS0043', () => {
    const { compactZigbeeIdentifiers } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    compactZigbeeIdentifiers(app, {});
    const d = app.drivers.find((x) => x.id === 'button_wireless_3');
    assert.ok(d);
    const mfr = d.zigbee.manufacturerName || [];
    assert.ok(mfr.includes('_TZ3000_famkxci2'), 'exact case survives compact');
    assert.ok((d.zigbee.productId || []).includes('TS0043'));
  });

  it('npm check:p2716 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2716']);
  });
});
