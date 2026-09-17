'use strict';

/**
 * P2560 — Smart Flow elegance + LocalSmartEnergyLearner (habits/dim/color/bias)
 *
 * Contre quoi:
 * - flat on→nominal_power ignoring dim/color/learned EMA
 * - flow cards without Smart branding / quality_label token
 * - learner missing from estimator wire
 * - estimate treated as measured when bias/learn path exists
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const Learner = require(path.join(ROOT, 'lib/telemetry/LocalSmartEnergyLearner.js'));
const { dimPowerFactor, colorModeFactor } = Learner;

function mockDevice(caps = {}, store = {}, settings = {}) {
  const s = { ...store };
  const c = { ...caps };
  const set = { ...settings };
  return {
    getCapabilityValue: (id) => c[id],
    getStoreValue: (k) => (s[k] === undefined ? null : s[k]),
    setStoreValue: async (k, v) => { s[k] = v; },
    getSetting: (k) => set[k],
    _store: s,
    _caps: c,
  };
}

describe('P2560 LocalSmartEnergyLearner', () => {
  it('dim^gamma reduces power; full dim ≈ 1', () => {
    assert.ok(dimPowerFactor(0.5, 1.75) < 0.5);
    assert.ok(dimPowerFactor(0.5, 1.75) > 0.2);
    assert.equal(dimPowerFactor(1, 1.75), 1);
    assert.equal(dimPowerFactor(0, 1.75), 0);
  });

  it('color mode soft factor stays bounded', () => {
    assert.ok(colorModeFactor('rgb') > 1);
    assert.ok(colorModeFactor('ww') < 1);
    assert.ok(colorModeFactor('rgb', 0.5, 0.9) <= 1.18);
    assert.ok(colorModeFactor(null) === 1);
  });

  it('blends learned EMA over manufacturer spec as samples grow', async () => {
    const d = mockDevice({ onoff: true, dim: 1 }, {});
    const L = new Learner(d);
    // Cold: mostly spec
    const cold = L.estimateSmartPowerW({ isOn: true, specW: 10, standbyW: 0.3 });
    assert.ok(Math.abs(cold - 10) < 0.5);

    for (let i = 0; i < 12; i++) {
      await L.observeMeasuredPower(6, { isOn: true });
    }
    const warm = L.estimateSmartPowerW({ isOn: true, specW: 10, standbyW: 0.3 });
    assert.ok(warm < cold, `learned should pull toward 6W: warm=${warm} cold=${cold}`);
    assert.ok(warm > 5 && warm < 9.5);
  });

  it('standby when off; predict uses on-ratio habit', async () => {
    const d = mockDevice({ onoff: false }, {
      telemetry_usage_on_ms: 3 * 3600_000,
      telemetry_usage_off_ms: 1 * 3600_000,
    });
    const L = new Learner(d);
    assert.equal(L.estimateSmartPowerW({ isOn: false, standbyW: 0.4, specW: 9 }), 0.4);

    await L.refreshHabitsFromUsage({
      onMs: 3 * 3600_000,
      offMs: 1 * 3600_000,
    });
    const snap = L.snapshot();
    assert.ok(snap.onRatio > 0.7 && snap.onRatio < 0.8);
    const pred = L.predictNextHourKwh({ powerW: 10, onRatio: snap.onRatio });
    assert.ok(pred > 0.006 && pred < 0.009);
  });

  it('bias soft-corrects estimate vs measured', async () => {
    const d = mockDevice({}, { smart_learn_bias: 1 });
    const L = new Learner(d);
    await L.observeEstimateBias(10, 8); // measured lower → bias < 1
    const b = Number(d._store.smart_learn_bias);
    assert.ok(b < 1 && b > 0.7);
  });
});

describe('P2560 Smart Flow cards + wire', () => {
  it('compose cards branded Smart + quality_label token', () => {
    for (const id of [
      'telemetry_is_measured',
      'telemetry_is_estimated',
      'telemetry_is_calculated',
      'telemetry_is_predicted',
      'telemetry_is_not_measured',
    ]) {
      const j = JSON.parse(fs.readFileSync(
        path.join(ROOT, `.homeycompose/flow/conditions/${id}.json`),
        'utf8',
      ));
      assert.match(j.title.en, /Smart/);
      assert.ok(j.hint?.en);
    }
    const trig = JSON.parse(fs.readFileSync(
      path.join(ROOT, '.homeycompose/flow/triggers/telemetry_source_changed.json'),
      'utf8',
    ));
    assert.match(trig.title.en, /Smart/);
    const names = (trig.tokens || []).map((t) => t.name);
    assert.ok(names.includes('quality_label'));
    assert.ok(names.includes('origin'));
  });

  it('estimator requires LocalSmartEnergyLearner and calls estimateSmartPowerW path', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/utils/DeviceTelemetryEstimator.js'), 'utf8');
    assert.match(src, /LocalSmartEnergyLearner/);
    assert.match(src, /estimateSmartPowerW/);
    assert.match(src, /observeMeasuredPower/);
    assert.match(src, /predictNextHourKwh/);
    assert.match(src, /quality_label/);
  });

  it('learner module exists and SSOT updated', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/telemetry/LocalSmartEnergyLearner.js')));
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/data-provenance-ssot.json'),
      'utf8',
    ));
    assert.ok(String(ssot.id || '').includes('P2560') || ssot.learner === 'LocalSmartEnergyLearner'
      || (ssot.related && ssot.related.includes('P2560')));
  });
});
