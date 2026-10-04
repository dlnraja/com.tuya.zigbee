'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { auditDriver, run, MATTER_MAP } = require('../tools/ci/smart-home-ecosystem-audit');

describe('smart-home ecosystem audit (Matter Bridge / Alexa / Google)', function () {
  this.timeout(60000);
  it('maps a light with onoff+dim to the bridge and Alexa', () => {
    const r = auditDriver('x', { class: 'light', capabilities: ['onoff', 'dim'] }, null, null);
    assert.deepStrictEqual(r.matter, ['onoff', 'dim']);
    assert.strictEqual(r.alexa, true);
    assert.strictEqual(r.google, true);
  });
  it('flags sub-capability-only switches (bridge reads exact ids only)', () => {
    const r = auditDriver('x', { class: 'socket', capabilities: ['onoff.gang1', 'onoff.gang2'] }, null, null);
    assert.strictEqual(r.matter.length, 0);
    assert.ok(r.subOnly.includes('onoff.gang1'));
  });
  it('flags a class that hides sensor capabilities', () => {
    const r = auditDriver('x', { class: 'other', capabilities: ['measure_temperature'] }, null, null);
    assert.ok(r.hidden.includes('measure_temperature'));
    assert.ok(r.findings.some((f) => f.includes('not exposed')));
  });
  it('smoke is bridged only under class sensor (bridge source @045787d)', () => {
    assert.ok(MATTER_MAP.sensor.includes('alarm_smoke'));
    assert.strictEqual(MATTER_MAP.smokealarm, undefined);
  });
  it('runs on the repo without invalid classes', () => {
    const r = run();
    assert.ok(r.total > 100);
    assert.ok(!r.drivers.some((d) => d.findings.some((f) => f.startsWith('invalid class'))));
  });
});
