'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));

function entry(mfr) {
  const hit = Object.keys(mfs).find((k) => k.toLowerCase() === mfr.toLowerCase() && mfs[k]?.driverId);
  assert.ok(hit, `missing mfs entry ${mfr}`);
  return { key: hit, e: mfs[hit] };
}

describe('P2295 mfs multi-identity enrichment', () => {
  it('ogkdpgy2 keeps zigbee pid TS0601 + retail names, no climate invent pid', () => {
    const { e } = entry('_TZE204_ogkdpgy2');
    assert.equal(e.driverId, 'air_quality_co2');
    assert.deepEqual(e.modelIds, ['TS0601']);
    assert.equal(e.pid, 'TS0601');
    assert.equal(e.modelIdsCount, 1);
    assert.ok(e.deviceNames.includes('DCR-LCD'));
    assert.ok(e.z2mModels.includes('TS0601_co2_sensor'));
    assert.ok(!/CK-TLSR/i.test(String(e.pid)));
  });

  it('curtain couples expose ZM16EL/ZM85EL as names not productIds', () => {
    const a = entry('_TZE200_68nvbio9').e;
    const b = entry('_TZE200_cf1sl3tj').e;
    const typo = entry('_TZE200_68nvbi09').e;
    for (const e of [a, b, typo]) {
      assert.equal(e.driverId, 'curtain_motor');
      assert.deepEqual(e.modelIds, ['TS0601']);
      assert.equal(e.pid, 'TS0601');
    }
    assert.ok(a.deviceNames.some((n) => /ZM16EL/i.test(n)));
    assert.ok(b.deviceNames.some((n) => /ZM85EL/i.test(n)));
  });

  it('mpbki2zm uses TYBAC names and drops invent PJ-1203A pid', () => {
    const { e } = entry('_TZE204_mpbki2zm');
    assert.equal(e.driverId, 'wall_thermostat');
    assert.equal(e.pid, 'TS0601');
    assert.ok(e.deviceNames.includes('TYBAC-006'));
    assert.notEqual(e.pid, 'PJ-1203A');
  });

  it('mrpevh8p keeps TS0041 and SH-SC07 whiteLabels', () => {
    const { e } = entry('_TZ3000_mrpevh8p');
    assert.equal(e.driverId, 'button_wireless_1');
    assert.deepEqual(e.modelIds, ['TS0041']);
    assert.ok(e.whiteLabels.includes('SH-SC07'));
  });

  it('HOBEIAN remains multiCouple with many pids/names', () => {
    const h = mfs.HOBEIAN;
    assert.equal(h.multiCouple, true);
    assert.ok(Object.keys(h.byPid).length >= 20);
    assert.ok(h.modelIds.includes('3315-S'));
    assert.ok(h.modelIds.includes('ZG-303Z'));
    assert.ok((h.deviceNames || []).length >= 5);
    assert.equal(h.byPid['3315-S'], 'water_leak_sensor');
  });

  it('air_quality_co2 productId must not include TS0601_co2 marketing alias', () => {
    const j = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/air_quality_co2/driver.compose.json'), 'utf8'),
    );
    assert.ok(!(j.zigbee.productId || []).some((p) => String(p).toLowerCase() === 'ts0601_co2'));
    assert.ok((j.zigbee.productId || []).includes('TS0601'));
  });
});
