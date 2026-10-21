'use strict';
// P2956 (audit 2026-10-21): the 4 LUMI overlaps that appeared with P2929/P2934 are Cartesian
// side effects (brand-only "LUMI" x shared productIds). Real Aqara devices match on their own
// lumi.* model id, which only one driver holds. Lock them as reviewed duals, never wider.
const test = require('node:test');
const assert = require('node:assert');
const { isReviewedCollision } = require('../../tools/ci/lib/reviewed-duals');
const app = require('../../app.json');
const byId = Object.fromEntries(app.drivers.map((d) => [d.id, d.zigbee || {}]));

test('LUMI overlaps are reviewed duals for the exact driver sets, any case', () => {
  for (const m of ['LUMI', 'lumi']) {
    assert.ok(isReviewedCollision(`${m}|TS0601`, ['device_generic_tuya_universal', 'motion_sensor', 'vibration_sensor']));
    assert.ok(isReviewedCollision(`${m}|CK-BL702-MWS-01(7016)`, ['motion_sensor', 'vibration_sensor']));
  }
  assert.ok(!isReviewedCollision('LUMI|TS0601', ['motion_sensor', 'climate_sensor']));
});

test('real Aqara model ids stay single-driver (specific driver wins)', () => {
  const holders = (pid) => Object.keys(byId).filter((id) => (byId[id].productId || []).includes(pid)
    && (byId[id].manufacturerName || []).some((x) => /^lumi$/i.test(x)));
  assert.deepStrictEqual(holders('lumi.vibration.aq1'), ['vibration_sensor']);
  assert.deepStrictEqual(holders('lumi.motion.agl04'), ['motion_sensor']);
});
