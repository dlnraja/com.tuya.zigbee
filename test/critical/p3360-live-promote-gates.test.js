'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const G = require('../../scripts/ci/live-promote-gates.cjs');

const T0 = Date.parse('2026-11-21T19:33:47Z');
const TWO_H = 2 * 60 * 60 * 1000;

function base(over = {}) {
  return {
    app: 'master',
    nowMs: T0 + TWO_H + 1000,
    testAtMs: T0,
    target: { id: 3717, version: '9.0.1636', state: 'test' },
    ci: {
      '🔍 Syntax Check & SDK3 Validation': 'success',
      '🛡️ Unified CI/CD Orchestrator': 'success',
      'Node 22 runtime tests': 'success',
      'Homey App Validate (all levels)': 'success',
    },
    validatePublish: true,
    candidateIds: ['air_purifier', 'curtain_motor'],
    requiredDriverIds: ['air_purifier'],
    candidateCouples: ['_TZE200_x+TS0601'],
    requiredCouples: ['_TZE200_x+TS0601'],
    crashTexts: [],
    scannedNow: true,
    minQuietMs: TWO_H,
    ...over,
  };
}

describe('P3360 Live promotion objective gates', () => {
  it('passes a healthy Test with green CI, no lost ids/couples, and evidence-driven soak', () => {
    const r = G.evaluateLiveGates(base());
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.promote, true);
    assert.deepStrictEqual(r.reasons, []);
  });

  it('does not require a fixed 7-day soak when evidence is clean', () => {
    const r = G.evaluateLiveGates(base({ nowMs: T0 + TWO_H + 1000, minQuietMs: TWO_H }));
    assert.ok(r.ok);
    assert.ok(r.soak.quietMs < 7 * 24 * 3600000);
  });

  it('holds when soak is shorter than the quiet floor, even with no crashes', () => {
    const r = G.evaluateLiveGates(base({ nowMs: T0 + 30 * 60 * 1000 }));
    assert.strictEqual(r.ok, false);
    assert.ok(r.reasons.some((x) => /soak too short/.test(x)));
  });

  it('holds on a new crash signal after Test, even after a long quiet window', () => {
    const r = G.evaluateLiveGates(base({
      nowMs: T0 + 10 * 24 * 3600000,
      crashTexts: [{ atMs: T0 + 3600000, text: 'master 9.0.1636 crash OOM on startup', source: 'notebook' }],
    }));
    assert.strictEqual(r.ok, false);
    assert.ok(r.reasons.some((x) => /crash signal/.test(x)));
  });

  it('ignores crash mentions dated before this Test', () => {
    const r = G.evaluateLiveGates(base({
      crashTexts: [{ atMs: T0 - 86400000, text: 'old AggregateError #3714', source: 'notebook' }],
    }));
    assert.strictEqual(r.ok, true);
  });

  it('holds when required CI or validate-publish is missing or red', () => {
    const red = G.evaluateLiveGates(base({ ci: { ...base().ci, 'Node 22 runtime tests': 'failure' } }));
    assert.strictEqual(red.ok, false);
    const miss = G.evaluateLiveGates(base({ ci: { ...base().ci, 'Homey App Validate (all levels)': undefined } }));
    assert.strictEqual(miss.ok, false);
    const val = G.evaluateLiveGates(base({ validatePublish: false }));
    assert.strictEqual(val.ok, false);
  });

  it('holds when a previous Live driver id or couple would be lost', () => {
    const ids = G.evaluateLiveGates(base({ requiredDriverIds: ['air_purifier', 'gone_id'] }));
    assert.strictEqual(ids.ok, false);
    const c = G.evaluateLiveGates(base({ requiredCouples: ['_TZE200_x+TS0601', '_TZE200_y+TS0601'] }));
    assert.strictEqual(c.ok, false);
  });

  it('allows an evidenced retired id (P3263 placeholder) and still holds unexplained losses', () => {
    const ok = G.evaluateLiveGates(base({
      requiredDriverIds: ['air_purifier', 'device_radiator_valve_thermostat'],
      retiredDriverIds: ['device_radiator_valve_thermostat'],
    }));
    assert.strictEqual(ok.ok, true);
    const bad = G.evaluateLiveGates(base({
      requiredDriverIds: ['air_purifier', 'gone_id'],
      retiredDriverIds: ['device_radiator_valve_thermostat'],
    }));
    assert.strictEqual(bad.ok, false);
  });

  it('Bastien must never go to Live, day or night, even when other gates would pass', () => {
    const day = G.evaluateLiveGates(base({ app: 'bastien', nowMs: Date.parse('2026-11-21T21:30:00Z') }));
    assert.strictEqual(day.ok, false);
    assert.strictEqual(day.promote, false);
    assert.strictEqual(day.neverLive, true);
    assert.ok(day.reasons.some((x) => /must never go to Live/.test(x)));
    const night = G.evaluateLiveGates(base({
      app: 'bastien',
      nowMs: Date.parse('2026-11-21T22:30:00Z'),
      ci: { 'Node 22 runtime tests': 'success', 'Homey App Validate (all levels)': 'success' },
    }));
    assert.strictEqual(night.ok, false);
    assert.strictEqual(night.promote, false);
    const byId = G.evaluateLiveGates(base({ app: 'master', appId: 'com.dlnraja.tuya.zigbee.bastien' }));
    assert.strictEqual(byId.ok, false);
    assert.strictEqual(byId.neverLive, true);
  });

  it('stable can promote when the same objective gates pass', () => {
    const r = G.evaluateLiveGates(base({
      app: 'stable',
      ci: {
        '🔍 Syntax Check & SDK3 Validation': 'success',
        'Node 22 runtime tests': 'success',
        'Homey App Validate (all levels)': 'success',
      },
    }));
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.promote, true);
  });

  it('skips promote when the target is already Live, and refuses a non-Test state', () => {
    const live = G.evaluateLiveGates(base({ target: { id: 3717, version: '9.0.1636', state: 'live' } }));
    assert.strictEqual(live.promote, false);
    assert.strictEqual(live.alreadyLive, true);
    const draft = G.evaluateLiveGates(base({ target: { id: 3717, version: '9.0.1636', state: 'draft' } }));
    assert.strictEqual(draft.ok, false);
  });
});
