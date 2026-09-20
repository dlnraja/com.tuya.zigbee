'use strict';

/**
 * P2635 — Switch / button / actuator Flow Contre quoi
 * Homey SDK3: trigger(device, tokens, state) — dropdown args match state, not tokens.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2635 flow state + device resolve (switches/buttons/actuators)', () => {
  it('stateFromFlowTokens builds button/gang for Homey runListener', () => {
    const { stateFromFlowTokens, flowArgId } = require('../../lib/flow/FlowCardDeviceResolve');
    assert.equal(flowArgId({ id: '2' }), '2');
    const st = stateFromFlowTokens({ gang: 3, button: 3 });
    assert.equal(st.button, '3');
    assert.equal(st.gang, '3');
  });

  it('shouldRunForDeviceAndButton is strict on dropdown filter', () => {
    const { shouldRunForDeviceAndButton } = require('../../lib/flow/FlowCardDeviceResolve');
    assert.equal(shouldRunForDeviceAndButton({ button: '1' }, {}), false);
    assert.equal(shouldRunForDeviceAndButton({ button: '1' }, { button: '1' }), true);
    assert.equal(shouldRunForDeviceAndButton({}, {}), true);
  });

  it('FlowCardHeuristics passes state (not empty {}) into trigger', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/flow/FlowCardHeuristics.js'), 'utf8');
    assert.ok(src.includes('stateFromFlowTokens'));
    assert.ok(src.includes('await card.trigger(device, tokens, state)'));
    assert.ok(!/await card\.trigger\(device, tokens, \{\}\)/.test(src));
  });

  it('PhysicalButtonMixin passes flowState into heuristic / trigger', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('stateFromFlowTokens'));
    assert.ok(src.includes('triggerFlowCardHeuristic(this, candidates, tokens, \'trigger\', flowState)'));
  });

  it('DeclaredFlowCardAutoWire does not gate triggers on !!args.device', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/flow/DeclaredFlowCardAutoWire.js'), 'utf8');
    assert.ok(src.includes('shouldRunForDeviceAndButton'));
    assert.ok(!src.includes('async (args) => !!args.device'));
  });

  it('SwitchActuatorFlowAutoWire hooked from UniversalFlowCardLoader', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/flow/SwitchActuatorFlowAutoWire.js')));
    const src = fs.readFileSync(path.join(ROOT, 'lib/flow/UniversalFlowCardLoader.js'), 'utf8');
    assert.ok(src.includes('autoWireSwitchActuatorFlows'));
    assert.ok(src.includes('P2635'));
  });

  it('FlowCardHelper re-exports strict matcher', () => {
    const { shouldRunForDeviceAndButton } = require('../../lib/FlowCardHelper');
    assert.equal(shouldRunForDeviceAndButton({ button: '2' }, { button: '1' }), false);
  });

  it('npm check:p2635 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2635']);
  });

  it('Bastien house SSOT complementary enrich locks P2634+P2635', () => {
    const ssotPath = path.join(ROOT, 'config/architecture/bastien-house-ssot.json');
    if (!fs.existsSync(ssotPath)) return; // master may omit Bastien SSOT
    const ssot = JSON.parse(fs.readFileSync(ssotPath, 'utf8'));
    assert.equal(ssot.p2634?.driver, 'switch_4gang');
    assert.ok(/ltt60asa/i.test(ssot.p2634?.couple || ''));
    assert.ok(ssot.p2635?.tipNote);
    const ltt = (ssot.liveMesh?.nodes || []).find((n) => /ltt60asa/i.test(n.mfr || ''));
    assert.ok(ltt, 'liveMesh must list ltt60asa module');
    assert.equal(ltt.driver, 'switch_4gang');
  });
});
