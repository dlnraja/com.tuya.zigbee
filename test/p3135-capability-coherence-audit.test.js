'use strict';
/**
 * P3135 (t719u/t721u/t722u/t723u): capability coherence ratchet.
 * A = drivers exposing enable_power_estimation with onoff but no estimated-energy path (same setting => same caps).
 * B = driver capabilities not mapped by the Homey HomeKit bridge (compensate per docs/rules/HOMEKIT_CAPABILITY_RULES.md).
 * C = real DPs mapped to capability:null with no setting/flow (compensate with custom/sub-capability, setting or flow).
 * Counts may only go down. Lower the baseline when you fix entries.
 */
const assert = require('assert');
const path = require('path');
const audit = require('../scripts/ci/capability-coherence-audit');
const BASE = {"A":27,"B":323,"C":166};

describe('P3135 capability coherence audit (ratchet)', () => {
  const r = audit.run(path.join(__dirname, '..'));
  it('A: same setting => same caps (power estimation)', () => {
    assert.ok(r.A.length <= BASE.A, `A grew ${r.A.length} > ${BASE.A}: ${r.A.join(',')}`);
  });
  it('B: HomeKit-unmapped capabilities do not grow', () => {
    assert.ok(r.B.length <= BASE.B, `B grew ${r.B.length} > ${BASE.B}`);
  });
  it('C: real DPs without exposed capability/setting/flow do not grow', () => {
    assert.ok(r.C.length <= BASE.C, `C grew ${r.C.length} > ${BASE.C}`);
  });
  it('HomeKit map keeps system caps and excludes non-bridged ones', () => {
    assert.ok(audit.HK.has('onoff') && !audit.HK.has('measure_voltage'));
  });
});
