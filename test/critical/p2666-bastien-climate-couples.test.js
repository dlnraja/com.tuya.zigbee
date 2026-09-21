'use strict';

/**
 * P2666 — Bastien climate sacred couples
 * Live dump: _TZ3000_fllyghyj+SNZB-02 and eWeLink+CK-TLSR…(7014) must home on climate_sensor.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'),
  );
}

function hasMfr(j, mfr) {
  return [].concat(j.zigbee?.manufacturerName || []).some(
    (m) => String(m).toLowerCase() === String(mfr).toLowerCase(),
  );
}

function hasPid(j, pid) {
  return [].concat(j.zigbee?.productId || []).includes(pid);
}

describe('P2666 Bastien climate couples', () => {
  it('climate_sensor owns fllyghyj + SNZB-02', () => {
    const j = compose('climate_sensor');
    assert.ok(hasMfr(j, '_TZ3000_fllyghyj'));
    assert.ok(hasPid(j, 'SNZB-02'));
  });

  it('climate_sensor owns eWeLink + CK-TLSR 7014', () => {
    const j = compose('climate_sensor');
    assert.ok(hasMfr(j, 'eWeLink'));
    assert.ok(hasPid(j, 'CK-TLSR8656-SS5-01(7014)'));
  });

  it('temphumidsensor3 does not claim fllyghyj', () => {
    const j = compose('temphumidsensor3');
    assert.equal(hasMfr(j, '_TZ3000_fllyghyj'), false);
  });

  it('registry + mfs_db point fllyghyj to climate_sensor', () => {
    const reg = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'),
    );
    const hit = (reg.cases || []).find(
      (c) =>
        c.canonicalDriver === 'climate_sensor'
        && [].concat(c.mfr || []).some((m) => /fllyghyj/i.test(m)),
    );
    assert.ok(hit, 'registry case for fllyghyj→climate_sensor');

    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
    const row = db._TZ3000_FLLYGHYJ || db._TZ3000_fllyghyj || db._tz3000_fllyghyj;
    assert.ok(row);
    assert.equal(row.driverId || row.driverHint, 'climate_sensor');
  });
});
