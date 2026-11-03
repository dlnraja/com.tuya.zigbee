'use strict';
// P3248 GH#516: _TZ3000_isw9u95y/TS0201 was dropped by publish compaction; every reported couple must survive.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..', '..');

describe('P3248 closed-issue reported couples pinned', function () {
  this.timeout(120000);
  it('isw9u95y pinned on climate_sensor and all reported couples survive', () => {
    const sacred = JSON.parse(fs.readFileSync(path.join(root, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8')).couples;
    assert.ok(sacred.some((c) => c.mfr === '_TZ3000_isw9u95y' && c.pid === 'TS0201' && c.driverId === 'climate_sensor'));
    const reported = JSON.parse(fs.readFileSync(path.join(root, 'data/leads/reported-couples.json'), 'utf8')).couples;
    assert.ok(reported.length >= 20);
    const gate = require(path.join(root, 'tools/ci/reported-couples-publish-survival.js'));
    const r = gate.check({ root, manifest: JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')), reported });
    assert.deepStrictEqual(r.dropped, []);
  });
});
