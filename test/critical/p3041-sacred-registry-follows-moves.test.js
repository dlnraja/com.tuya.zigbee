'use strict';
// P3041 (25/10/2026 Paris): P3039d lot B moved _TZ3000_mwd3c2at|TS0202 (Z2M RTX ZMS4, PIR) to
// slim_motion_sensor but the misattribution registry still named smart_irrigation_valve, so
// audit-sacred-couple --from-registry failed (p2841, Auto-Fix + Publish red since 17:43).
// Guard: every locked registry couple is claimed by exactly its canonical driver, and this couple stays.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'user-misattribution-registry.json'), 'utf8'));
const compose = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
const lc = (a) => (a || []).map((x) => String(x).toLowerCase());

describe('P3041 sacred registry follows class moves', () => {
  it('_TZ3000_mwd3c2at|TS0202 is locked to slim_motion_sensor and still shipped there', () => {
    const c = reg.cases.find((x) => x.id === 'p2240-mwd3c2at-irrigation-valve-ts0202');
    assert.ok(c, 'registry case kept');
    assert.equal(c.canonicalDriver, 'slim_motion_sensor');
    assert.ok(lc(c.mfr).includes('_tz3000_mwd3c2at') && c.productId.includes('TS0202'));
    const z = compose('slim_motion_sensor').zigbee;
    assert.ok(lc(z.manufacturerName).includes('_tz3000_mwd3c2at') && z.productId.includes('TS0202'));
    for (const f of c.forbiddenDrivers) assert.notEqual(f, c.canonicalDriver);
  });

  it('every locked registry couple: its canonical driver exists and claims mfr+pid', () => {
    const bad = [];
    for (const c of reg.cases || []) {
      if (c.doNotTouch === true || c.doNotLock === true || !c.canonicalDriver) continue;
      const mfr = String((c.mfr || [])[0] || '').toLowerCase();
      const pid = String((c.productId || [])[0] || '').toLowerCase();
      if (!mfr) continue;
      const p = path.join(ROOT, 'drivers', c.canonicalDriver, 'driver.compose.json');
      if (!fs.existsSync(p)) { bad.push(`${c.id}: missing driver ${c.canonicalDriver}`); continue; }
      const z = compose(c.canonicalDriver).zigbee || {};
      const okM = lc(z.manufacturerName).includes(mfr);
      const okP = !pid || lc(z.productId).includes(pid);
      if (!okM || !okP) bad.push(`${c.id}: ${c.canonicalDriver} lacks ${mfr}|${pid}`);
    }
    assert.deepEqual(bad, []);
  });

  it('mfs_db follows the registry lock for _TZ3000_MWD3C2AT (no high-severity align drift)', () => {
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));
    const m = db.manufacturers || db;
    const k = Object.keys(m).find((x) => x.toUpperCase() === '_TZ3000_MWD3C2AT');
    assert.ok(k, 'mfs_db keeps the couple');
    assert.equal(m[k].driverId, 'slim_motion_sensor');
  });
});
