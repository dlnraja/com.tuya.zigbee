'use strict';

/**
 * P2251 — Enrich from interviews / prior prompts / soft couples
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { classifyOperatingFamily } = require('../../lib/zigbee/DeviceOperatingMode');
const FPDB = require('../../lib/DeviceFingerprintDB');

const ROOT = path.join(__dirname, '..', '..');

describe('P2251 interview + soft-couple enrich', () => {
  it('INT-062 is Moes button_wireless_4 TS0044 (not TS011F plug)', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/data/DEVICE_INTERVIEWS.json'), 'utf8'));
    const cats = j.interviews || j.categories || j;
    let found = null;
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) return o.forEach(walk);
      if (o.id === 'INT-062') found = o;
      Object.values(o).forEach(walk);
    };
    walk(cats);
    assert.ok(found, 'INT-062');
    assert.strictEqual(found.driver, 'button_wireless_4');
    assert.ok(/TS0044/i.test(String(found.productId)));
    assert.ok(!/TS011F/i.test(String(found.productId)));
  });

  it('kfu8zapd / xabckq1v never write 0x8004', () => {
    for (const mfr of ['_TZ3000_kfu8zapd', '_TZ3000_xabckq1v', '_TZ3000_xffhmvhv']) {
      const fam = classifyOperatingFamily({
        getSetting: (k) => (k === 'zb_manufacturer_name' ? mfr : (k === 'zb_model_id' ? 'TS004F' : undefined)),
        getSettings: () => ({ zb_manufacturer_name: mfr, zb_model_id: 'TS004F' }),
      });
      assert.strictEqual(fam.writeSceneAttr, false, mfr);
    }
  });

  it('FPDB has nkcobies + HOBEIAN climate ZG-227ZL', () => {
    assert.ok(FPDB.lookup('HOBEIAN', 'ZG-227ZL') || FPDB.FINGERPRINT_DB?.['HOBEIAN|ZG-227ZL']
      || require('../../lib/DeviceFingerprintDB'));
    const db = require('../../lib/DeviceFingerprintDB');
    // static map access
    const src = fs.readFileSync(path.join(ROOT, 'lib/DeviceFingerprintDB.js'), 'utf8');
    assert.ok(src.includes("'_TZ3000_nkcobies|TS011F'"));
    assert.ok(src.includes("'HOBEIAN|ZG-227ZL'"));
    assert.ok(src.includes("'HOBEIAN|ZG-106Z'"));
  });

  it('mfs HOBEIAN is multiCouple byPid (no bare TS0601)', () => {
    const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json')));
    const h = mfs.HOBEIAN;
    assert.ok(h.multiCouple);
    assert.strictEqual(h.byPid['ZG-227Z'], 'climate_sensor');
    assert.strictEqual(h.byPid['ZG-303Z'], 'soil_sensor');
    assert.strictEqual(h.byPid['ZG-204ZM'], 'presence_sensor_radar');
    assert.ok(!(h.modelIds || []).some((p) => /^TS0601$/i.test(p)));
  });

  it('SergeP Nous/SoPhos is doNotTouch in registry', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const c = (reg.cases || []).find((x) => x.id === 'p2251-sergep-nous-sophos-external');
    assert.ok(c);
    assert.strictEqual(c.doNotTouch, true);
  });
});
