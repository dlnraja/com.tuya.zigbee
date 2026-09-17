'use strict';

/**
 * P2558 — Elegant measured-first provenance UX + Smart Flow cards
 *
 * Contre quoi:
 * - estimated title looks like a real meter (no ≈ mark)
 * - predicted battery shown as measured
 * - estimate overwriting measured (priority)
 * - missing telemetry_is_predicted / telemetry_is_not_measured cards
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DP = require(path.join(ROOT, 'lib/telemetry/DataProvenance.js'));

describe('P2558 elegant provenance UX', () => {
  it('priority: measured > calculated > estimated > predicted', () => {
    assert.ok(DP.priorityOf('measured') > DP.priorityOf('calculated'));
    assert.ok(DP.priorityOf('calculated') > DP.priorityOf('estimated'));
    assert.ok(DP.priorityOf('estimated') > DP.priorityOf('predicted'));
    assert.equal(DP.canOverwrite('measured', 'estimated'), false);
    assert.equal(DP.canOverwrite('estimated', 'measured'), true);
    assert.equal(DP.canOverwrite('predicted', 'calculated'), true);
  });

  it('elegant titles: measured clean; others ≈ / ƒ / →', () => {
    const meas = DP.buildProvenanceCapabilityOptions({ title: { en: 'Power', fr: 'Puissance' }, units: 'W' }, 'measured');
    assert.equal(meas.title.en, 'Power');
    assert.equal(meas.title.fr, 'Puissance');
    assert.equal(meas.units, 'W');

    const est = DP.buildProvenanceCapabilityOptions({ title: { en: 'Power', fr: 'Puissance' }, units: 'W' }, 'estimated');
    assert.match(est.title.en, /≈ estimated/);
    assert.match(est.title.fr, /≈ estimé/);
    assert.match(est.units, /≈/);

    const calc = DP.buildProvenanceCapabilityOptions({ title: { en: 'Current' }, units: 'A' }, 'calculated');
    assert.match(calc.title.en, /ƒ calculated/);
    assert.match(calc.units, /ƒ/);

    const pred = DP.buildProvenanceCapabilityOptions({ title: { en: 'Battery', fr: 'Batterie' }, units: '%' }, 'predicted');
    assert.match(pred.title.en, /→ predicted/);
    assert.match(pred.title.fr, /→ prévu/);
    assert.match(pred.units, /→/);
  });

  it('originFromReason maps battery decay → predicted', () => {
    assert.equal(DP.originFromReason('last-real:telemetry_last_battery_percent:2.5d'), 'predicted');
    assert.equal(DP.originFromReason('energy-integral'), 'calculated');
    assert.equal(DP.originFromReason('nominal-standby'), 'estimated');
    assert.equal(DP.originFromReason('tuya-dp-17'), 'measured');
  });

  it('compose + app.json declare all five conditions + trigger', () => {
    for (const id of [
      'telemetry_is_measured',
      'telemetry_is_estimated',
      'telemetry_is_calculated',
      'telemetry_is_predicted',
      'telemetry_is_not_measured',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, `.homeycompose/flow/conditions/${id}.json`)), id);
    }
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const ids = (app.flow?.conditions || []).map((c) => c.id);
    assert.ok(ids.includes('telemetry_is_predicted'));
    assert.ok(ids.includes('telemetry_is_not_measured'));
    assert.ok((app.flow?.triggers || []).some((t) => t.id === 'telemetry_source_changed'));
  });

  it('app.js registers predicted + not_measured', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.match(src, /telemetry_is_predicted/);
    assert.match(src, /telemetry_is_not_measured/);
    assert.match(src, /isNonMeasured/);
  });
});
