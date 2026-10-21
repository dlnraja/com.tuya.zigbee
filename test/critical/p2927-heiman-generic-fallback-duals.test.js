'use strict';
// P2927: the 3 HEIMAN couples shared by smoke_detector_advanced and universal_zigbee are kept on
// purpose (user decision 2026-10-21: specific driver wins, generic is the fallback).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { isReviewedCollision } = require('../../tools/ci/lib/reviewed-duals');
const D = require('../../scripts/leads/dual-couples.js');
const PIDS = ['TS0041', 'TS0205', 'TS0601'];
const PAIR = ['smoke_detector_advanced', 'universal_zigbee'];

test('the 3 HEIMAN couples are reviewed duals with a reason, in any mfr case', () => {
  const j = require('../../data/native-matrix-reviewed-duals.json');
  for (const pid of PIDS) {
    const e = j.entries.find((x) => x.couple === `HEIMAN|${pid}`);
    assert.ok(e && /specific driver wins/i.test(e.reason), pid);
    for (const m of ['HEIMAN', 'heiman']) {assert.ok(isReviewedCollision(`${m}|${pid}`, PAIR), `${m}|${pid}`);}
  }
  // never wider: another driver set is not covered
  assert.ok(!isReviewedCollision('HEIMAN|TS0205', ['smoke_detector_advanced', 'motion_sensor']));
});

test('dual-couple checker keeps them with the fallback reason', () => {
  const drivers = D.loadDrivers(ROOT); const ev = D.loadEvidence(ROOT);
  for (const pid of PIDS) {
    const r = D.classify({ mfr: 'heiman', pid, drivers: PAIR }, drivers, ev);
    assert.strictEqual(r.verdict, 'kept'); assert.match(r.why, /fallback/);
  }
});

test('Homey takes the first matching driver: the specific one is listed first', () => {
  const ids = require('../../app.json').drivers.map((d) => d.id);
  assert.ok(ids.indexOf('smoke_detector_advanced') >= 0 && ids.indexOf('smoke_detector_advanced') < ids.indexOf('universal_zigbee'));
  for (let i = 1; i < ids.length; i++) {assert.ok(ids[i - 1] <= ids[i], `drivers sorted by id at ${ids[i]}`);}
});
