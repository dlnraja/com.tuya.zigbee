'use strict';

/**
 * P2613 — Contre quoi: remote mfs entries must not carry IKEA/Lumi Cartesian bleed
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const FLEET = new Set([
  'button_wireless_1', 'button_wireless_2', 'button_wireless_3', 'button_wireless_4',
  'wall_remote_1_gang', 'wall_remote_2_gang', 'wall_remote_3_gang', 'scene_switch_4',
]);
const JUNK = /^(3450-L|E1\d{3}|LUMI\.|ROM001|01MINIZB|A11Z|BASICZBR3)/i;

describe('P2613 remote mfs couple prune', () => {
  it('locked Moes couples still exact', () => {
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
    const want = [
      ['_tz3000_filhl5b7', 'TS0041', 'button_wireless_1'],
      ['_tz3000_cllghx1k', 'TS0042', 'button_wireless_2'],
      ['_tz3000_1kmurvlx', 'TS0043', 'button_wireless_3'],
    ];
    for (const [mfr, pid, drv] of want) {
      const k = Object.keys(db).find((x) => x.toLowerCase() === mfr);
      assert.ok(k, mfr);
      assert.equal(db[k].driverId, drv);
      assert.deepEqual(db[k].modelIds, [pid]);
    }
  });

  it('no IKEA/Lumi junk on remote-fleet mfs entries (sample gate)', () => {
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
    let offenders = 0;
    for (const [k, e] of Object.entries(db)) {
      if (!k.startsWith('_') || !e || !FLEET.has(e.driverId)) continue;
      const junk = (e.modelIds || []).filter((p) => JUNK.test(p));
      if (junk.length) {
        offenders++;
        if (offenders <= 5) console.log('bleed', k, e.driverId, junk.slice(0, 3).join(','));
      }
    }
    assert.equal(offenders, 0, `${offenders} remote mfs entries still bleed junk pids`);
  });

  it('adaptive critical test runner exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/run-critical-tests-track-adaptive.js')));
  });
});
