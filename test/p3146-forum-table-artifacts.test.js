'use strict';
/* eslint-env mocha */
// P3146: forum 156967#12 table (TS0044=_TZ3000_wkai4ga5, TS0042=_TZ3000_dfgbtub0) was cross-multiplied by the
// harvester. The two artifact couples are removed with evidence; the two real couples stay.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const g = require('../scripts/ci/couple-removal-guard.js');
const ev = require('../scripts/maintenance/couple-removal-evidence.js');
describe('P3146 forum-table artifact couples removed, real couples kept', function () {
  const R = path.join(__dirname, '..');
  const head = g.loadDrivers((f) => fs.readFileSync(path.join(R, f), 'utf8'), fs.readdirSync(path.join(R, 'drivers')));
  it('artifact couples match no driver, real couples keep their driver', function () {
    assert.deepStrictEqual(g.matchedDrivers(head, '_TZ3000_dfgbtub0', 'TS0044'), []);
    assert.deepStrictEqual(g.matchedDrivers(head, '_TZ3000_wkai4ga5', 'TS0042'), []);
    assert.ok(g.matchedDrivers(head, '_TZ3000_dfgbtub0', 'TS0042').includes('button_wireless_2'));
    assert.deepStrictEqual(g.matchedDrivers(head, '_TZ3000_wkai4ga5', 'TS0044'), ['scene_switch_4']);
    assert.deepStrictEqual(g.matchedDrivers(head, '_TZ3000_gbm10jnj', 'TS0044'), []);
    assert.ok(g.matchedDrivers(head, '_TZ3000_gbm10jnj', 'TS0043').includes('button_wireless_3'));
  });
  it('each removal has a full evidence entry', function () {
    const s = ev.load();
    assert.ok(ev.hasEvidence(s, '_TZ3000_dfgbtub0', 'button_wireless_4'));
    assert.ok(ev.hasEvidence(s, '_TZ3000_wkai4ga5', 'button_wireless_2'));
    assert.ok(ev.hasEvidence(s, '_TZ3000_gbm10jnj', 'button_wireless_4'));
  });
  it('table scan: the only matched suspect left is the cartesian side effect la2c2uo9|TS0001 (real TS0601 dimmer)', function () {
    if (!fs.existsSync(path.join(R, 'data/forum/forum-leads-ssot.json'))) {this.skip();} // master-only harvester data
    const left = require('../scripts/maintenance/forum-table-crossproduct-scan.js').scan().filter((x) => x.matched.length);
    assert.deepStrictEqual(left.map((x) => x.couple), ['_TZE200_la2c2uo9|TS0001']);
  });
});
