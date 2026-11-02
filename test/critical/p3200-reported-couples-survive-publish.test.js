'use strict';
// P3200 GH#581/#584: a listed couple must survive publish compaction, else "Unknown Zigbee device".
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..', '..');
const gate = require(path.join(root, 'tools/ci/reported-couples-publish-survival.js'));

describe('P3200 reported couples survive publish compaction', function () {
  this.timeout(120000);
  it('extracts couples only from single-pid reports', () => {
    const c = gate.couplesFromIssues([
      { number: 1, title: 'TS0201 / _TZ3000_yupc0pb7 not recognized', body: '' },
      { number: 2, title: '_TZ3000_abcdefgh TS0001 or TS0002', body: '' },
    ]);
    assert.deepStrictEqual(c, [{ mfr: '_TZ3000_yupc0pb7', pid: 'TS0201', source: 'GH#1' }]);
  });
  it('flags a listed-but-dropped couple and a case-only match', () => {
    const manifest = { drivers: [{ id: 'd', zigbee: { manufacturerName: ['_tz3000_aaaaaaaa', '_TZ3000_bbbbbbbb'], productId: ['TS0201'] } }] };
    const payload = { drivers: [{ id: 'd', zigbee: { manufacturerName: ['_tz3000_aaaaaaaa'], productId: ['TS0201'] } }] };
    const r = gate.check({ manifest, payload, reported: [
      { mfr: '_TZ3000_bbbbbbbb', pid: 'TS0201', source: 'x' },
      { mfr: '_TZ3000_AAAAAAAA', pid: 'TS0201', source: 'y' },
    ] });
    assert.strictEqual(r.dropped.length, 1);
    assert.strictEqual(r.suspect.length, 1);
  });
  it('GH#581 and GH#584 couples are pinned and in the simulated payload', () => {
    const sacred = JSON.parse(fs.readFileSync(path.join(root, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8')).couples;
    for (const [m, p, d] of [['_TZ3000_yupc0pb7', 'TS0201', 'climate_sensor'], ['_TZE284_awepdiwi', 'TS0601', 'soil_sensor']]) {
      assert.ok(sacred.some((c) => c.mfr === m && c.pid === p && c.driverId === d), `${m} pinned`);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const reported = JSON.parse(fs.readFileSync(path.join(root, 'data/leads/reported-couples.json'), 'utf8')).couples;
    const r = gate.check({ root, manifest, reported });
    assert.deepStrictEqual(r.dropped, []);
  });
});
