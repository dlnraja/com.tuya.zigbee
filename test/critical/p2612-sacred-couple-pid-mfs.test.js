'use strict';

/**
 * P2612 — Contre quoi: remote variants locked as (mfr,pid) couples in mfs_db
 * Fail if Moes ZT-YK / tk3s5tyg bleed junk pids or lose sacred pid.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const COUPLES = [
  ['_TZ3000_filhl5b7', 'TS0041', 'button_wireless_1'],
  ['_TZ3000_cllghx1k', 'TS0042', 'button_wireless_2'],
  ['_TZ3000_1kmurvlx', 'TS0043', 'button_wireless_3'],
  ['_TZ3000_bi6lpsew', 'TS0043', 'button_wireless_3'],
  ['_TZ3000_tk3s5tyg', 'TS0041', 'button_wireless_1'],
  ['_TZ3400_tk3s5tyg', 'TS0041', 'wall_remote_1_gang'],
];

function mfsEntry(db, mfr) {
  const want = mfr.toLowerCase();
  for (const [k, v] of Object.entries(db)) {
    if (k.startsWith('_') && k.toLowerCase() === want) return { key: k, entry: v };
  }
  return null;
}

describe('P2612 sacred couples pid+mfs', () => {
  it('mfs_db locks verified (mfr,pid) only — no IKEA/Lumi bleed on Moes remotes', () => {
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
    for (const [mfr, pid, driverId] of COUPLES) {
      const hit = mfsEntry(db, mfr);
      assert.ok(hit, `mfs missing ${mfr}`);
      const { entry } = hit;
      assert.equal(entry.driverId, driverId, `${mfr} wrong driver`);
      const ids = entry.modelIds || [];
      assert.ok(ids.includes(pid), `${mfr} missing pid ${pid} in ${JSON.stringify(ids)}`);
      // Contre quoi bleed
      const junk = ids.filter((p) => /^(E1|LUMI|ROM001|3450|GS361|HS1SA|TS0601|TS0205|TS0215)/i.test(p));
      assert.equal(junk.length, 0, `${mfr} still bleeds junk pids: ${junk.join(',')}`);
      assert.ok(ids.length <= 3, `${mfr} modelIds too wide (${ids.length}) — couple lock expected`);
    }
  });

  it('compose keeps each couple on the canonical driver', () => {
    for (const [mfr, pid, driverId] of COUPLES) {
      const composePath = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;
      const c = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = c.zigbee?.manufacturerName || [];
      const pids = c.zigbee?.productId || [];
      assert.ok(mfrs.some((m) => m.toLowerCase() === mfr.toLowerCase()), `${driverId} missing mfr ${mfr}`);
      assert.ok(pids.includes(pid), `${driverId} missing pid ${pid}`);
    }
  });

  it('TZ3000 vs TZ3400 tk3s5tyg stay distinct couples', () => {
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
    const a = mfsEntry(db, '_TZ3000_tk3s5tyg');
    const b = mfsEntry(db, '_TZ3400_tk3s5tyg');
    assert.ok(a && b);
    assert.equal(a.entry.driverId, 'button_wireless_1');
    assert.equal(b.entry.driverId, 'wall_remote_1_gang');
    assert.ok((a.entry.modelIds || []).includes('TS0041'));
    assert.ok((b.entry.modelIds || []).includes('TS0041'));
  });
});
