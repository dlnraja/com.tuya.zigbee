'use strict';

/**
 * P2556 — Data provenance: measured vs intelligent estimate vs calculated
 *
 * Contre quoi:
 * - estimated/calculated values shown as if they were live meter reports
 * - only binary telemetry_is_estimated (no measured/calculated cards)
 * - SmartEnergyManager silent audit not stamping origin
 * - DeviceTelemetryEstimator overwriting measured with estimates
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DP = require(path.join(ROOT, 'lib/telemetry/DataProvenance.js'));

describe('P2556 data provenance', () => {
  it('normalizes legacy direct → measured and reason heuristics', () => {
    assert.equal(DP.normalizeOrigin('direct'), 'measured');
    assert.equal(DP.normalizeOrigin('zcl'), 'measured');
    assert.equal(DP.normalizeOrigin('approx'), 'estimated');
    assert.equal(DP.normalizeOrigin('from_vi'), 'calculated');
    assert.equal(DP.toLegacySource('measured'), 'direct');
    assert.equal(DP.originFromReason('nominal-standby'), 'estimated');
    assert.equal(DP.originFromReason('energy-integral'), 'calculated');
    assert.equal(DP.originFromReason('tuya-dp-17'), 'measured');
  });

  it('UX titles append · estimated / · calculated and unit marks', () => {
    const est = DP.buildProvenanceCapabilityOptions({ title: { en: 'Power' }, units: 'W' }, 'estimated');
    assert.match(est.title.en, /estimated/i);
    assert.match(est.units, /≈/);
    const calc = DP.buildProvenanceCapabilityOptions({ title: { en: 'Current' }, units: 'A' }, 'calculated');
    assert.match(calc.title.en, /calculated/i);
    assert.match(calc.units, /ƒ/);
    const meas = DP.buildProvenanceCapabilityOptions({ title: { en: 'Power · ≈ estimated' }, units: 'W ≈' }, 'measured');
    assert.equal(meas.title.en, 'Power');
    assert.equal(meas.units, 'W');
  });

  it('compose + app.json declare three conditions and source-changed trigger', () => {
    for (const id of ['telemetry_is_estimated', 'telemetry_is_measured', 'telemetry_is_calculated']) {
      const p = path.join(ROOT, `.homeycompose/flow/conditions/${id}.json`);
      assert.ok(fs.existsSync(p), `missing compose ${id}`);
    }
    assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose/flow/triggers/telemetry_source_changed.json')));

    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const condIds = (app.flow?.conditions || []).map((c) => c.id);
    assert.ok(condIds.includes('telemetry_is_estimated'));
    assert.ok(condIds.includes('telemetry_is_measured'));
    assert.ok(condIds.includes('telemetry_is_calculated'));
    const trigIds = (app.flow?.triggers || []).map((c) => c.id);
    assert.ok(trigIds.includes('telemetry_source_changed'));
  });

  it('app.js wires provenance conditions via DataProvenance', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.match(src, /_registerTelemetryProvenanceFlowCards/);
    assert.match(src, /telemetry_is_measured/);
    assert.match(src, /telemetry_is_calculated/);
    assert.match(src, /DataProvenance/);
  });

  it('DeviceTelemetryEstimator + SmartEnergyManager stamp origins', () => {
    const est = fs.readFileSync(path.join(ROOT, 'lib/utils/DeviceTelemetryEstimator.js'), 'utf8');
    assert.match(est, /DataProvenance/);
    assert.match(est, /_setCapabilityWithOrigin/);
    assert.match(est, /telemetry_source_changed/);
    assert.match(est, /isMeasured/);

    const energy = fs.readFileSync(path.join(ROOT, 'lib/managers/SmartEnergyManager.js'), 'utf8');
    assert.match(energy, /DataProvenance/);
    assert.match(energy, /origin:\s*'measured'/);
    assert.match(energy, /audit-silent-5min/);
  });

  it('SSOT classifies BOTH + gate check:p2556', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/data-provenance-ssot.json'), 'utf8'));
    assert.equal(ssot.classify, 'BOTH');
    assert.ok(ssot.origins.includes('measured'));
    assert.ok(ssot.origins.includes('estimated'));
    assert.ok(ssot.origins.includes('calculated'));
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2556'], 'check:p2556 must exist');
  });
});
