'use strict';
/* eslint-env mocha */
// P3134 (t727u): removals are per exact couple; every source-confirmed couple of the #585 makers still matches.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const g = require('../scripts/ci/couple-removal-guard.js');
const R = path.join(__dirname, '..');
const head = g.loadDrivers((f) => fs.readFileSync(path.join(R, f), 'utf8'), fs.readdirSync(path.join(R, 'drivers')));
describe('P3134 couple-removal guard', function () {
  it('every source-confirmed couple of the P3131 makers still matches a driver', function () {
    const mk = /^(_TZ3000_46vasa5h|_TZ3000_cehuw1lw|_TZE284_xpq2rzhq|_TZ3000_dfgbtub0)\|/;
    const cs = [...g.confirmedCouples(R)].filter((c) => mk.test(c));
    assert.ok(cs.length >= 4);
    for (const c of cs) { const [m, p] = c.split('|'); assert.ok(g.matchedDrivers(head, m, p).length, c); }
    assert.ok(g.matchedDrivers(head, '_TZ3000_dfgbtub0', 'TS0044').includes('button_wireless_4'), 'attested TS0044 kept');
  });
  it('flags a maker removal that drops another confirmed pid', function () {
    const D = (m, p) => ({ m: new Set(m), p: new Set(p) });
    const base = { a: D(['_X_1'], ['TS0042']), b: D(['_X_1'], ['TS0043']) };
    const bad = { a: D(['_X_1'], ['TS0042']), b: D([], ['TS0043']) };
    assert.strictEqual(g.check(base, bad, new Set(['_X_1|TS0043'])).length, 1);
    assert.strictEqual(g.check(base, bad, new Set(['_X_1|TS0042'])).length, 0);
  });
});

describe('P3134 removal evidence (t730u)', function () {
  const ev = require('../scripts/maintenance/couple-removal-evidence.js');
  it('blocks a maker removal without evidence and accepts one with all sources', function () {
    const D = (m) => ({ m: new Set(m), p: new Set(['TS0042']) });
    const base = { a: D(['_X_1']) }; const head = { a: D([]) };
    assert.strictEqual(g.check(base, head, new Set(), { entries: [] }).length, 1);
    const sources = Object.fromEntries(ev.REQUIRED.map((k) => [k, 'checked']));
    assert.strictEqual(g.check(base, head, new Set(), { entries: [{ couple: '_X_1|TS0042', driver: 'a', sources }] }).length, 0);
  });
  it('records the four P3131 removals and marks dfgbtub0|TS0044 unverified', function () {
    const s = ev.load();
    for (const [m, d] of [['_TZ3000_46vasa5h', 'switch_1gang'], ['_TZ3000_cehuw1lw', 'button_wireless_plug'], ['_TZE284_xpq2rzhq', 'climate_sensor'], ['_TZ3000_dfgbtub0', 'button_wireless_3']]) {assert.ok(ev.hasEvidence(s, m, d), m);}
    assert.ok(fs.readFileSync(path.join(R, 'docs/rules/COUPLE_REMOVAL_EVIDENCE.md'), 'utf8').includes('couple-removal-guard'));
    const hits = [];
    const walk = (o) => { if (o && typeof o === 'object') { if (o.id === 'p2293-dfgbtub0-ts0044-wireless-4') {hits.push(o.verification);} Object.values(o).forEach(walk); } };
    walk(require('../data/user-misattribution-registry.json'));
    assert.deepStrictEqual([...new Set(hits)], ['unverified']);
  });
});
