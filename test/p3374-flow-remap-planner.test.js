'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { planRemap, applyPlanToClone } = require('../lib/flow-remap/FlowRemapPlanner');
const { findOrphanPairs } = require('../lib/flow-remap/OrphanDeviceMatcher');
const { writesEnabled, CONFIRM_TOKEN, FLOW_CONVERTER } = require('../lib/flow-remap/constants');
const { moveAdvice } = require('../scripts/lib/couple-move-policy');

describe('P3374 flow remap planner and orphan matcher', () => {
  it('previews hits and stays dry-run without APPLY', () => {
    const flows = {
      a: { name: 'Kitchen', trigger: { uri: 'homey:device:OLD' }, actions: [{ uri: 'homey:device:OLD' }], conditions: [] },
      b: { name: 'Other', trigger: { uri: 'homey:device:ELSE' }, actions: [], conditions: [] },
    };
    const plan = planRemap({ flows, advancedFlows: {}, oldId: 'OLD', newId: 'NEW', dryRun: true });
    assert.strictEqual(plan.ok, true);
    assert.strictEqual(plan.dryRun, true);
    assert.strictEqual(plan.standardCount, 1);
    assert.strictEqual(plan.applyAllowed, false);
  });

  it('applyAllowed only with confirm token and dryRun false', () => {
    const plan = planRemap({ flows: {}, advancedFlows: {}, oldId: 'A', newId: 'B', dryRun: false, confirm: CONFIRM_TOKEN });
    assert.strictEqual(plan.applyAllowed, true);
    assert.strictEqual(plan.dryRun, false);
  });

  it('rejects same ids and applies clone swap', () => {
    assert.strictEqual(planRemap({ oldId: 'x', newId: 'x' }).ok, false);
    const out = applyPlanToClone({ trigger: { uri: 'homey:device:OLD' } }, 'OLD', 'NEW');
    assert.strictEqual(out.trigger.uri, 'homey:device:NEW');
  });

  it('matches orphans by IEEE and by couple+driver', () => {
    const pairs = findOrphanPairs([
      { id: '1', name: 'Old', driverId: 'wall_dimmer_tuya', available: false, data: { ieeeAddress: 'aa:bb', manufacturerName: '_TZ3210_5rta89nj', productId: 'TS0601' } },
      { id: '2', name: 'New', driverId: 'curtain_motor', available: true, data: { ieeeAddress: 'aa:bb', manufacturerName: '_TZ3210_5rta89nj', productId: 'TS0601' } },
    ]);
    assert.ok(pairs.some((p) => p.reason === 'same-ieee'));
  });

  it('kill switch defaults to writes off and move advice mentions Flow Converter on re-pair', () => {
    assert.strictEqual(writesEnabled({}), false);
    const rePair = moveAdvice({ canMapInPlace: false, capabilityIdsChange: true });
    assert.strictEqual(rePair.mentionFlowConverter, true);
    assert.strictEqual(rePair.flowConverter.appId, FLOW_CONVERTER.appId);
    const inplace = moveAdvice({ canMapInPlace: true, capabilityIdsChange: false });
    assert.strictEqual(inplace.rePair, false);
  });
});
