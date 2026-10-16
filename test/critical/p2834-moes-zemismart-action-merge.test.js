'use strict';

/**
 * P2834 Contre quoi: Moes/Zemismart action merge must UNION ZCL+raw+DP+detect,
 * never force DP on sacred zcl_only, never invent pid.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MOD = path.join(ROOT, 'lib', 'protocol', 'MoesZemismartActionMerge.js');
const SSOT = path.join(ROOT, 'config', 'architecture', 'moes-zemismart-action-merge-ssot.json');

describe('P2834 Moes/Zemismart action merge', () => {
  it('module + SSOT exist', () => {
    assert.ok(fs.existsSync(MOD), 'MoesZemismartActionMerge.js missing');
    assert.ok(fs.existsSync(SSOT), 'SSOT missing');
    const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
    assert.equal(ssot.id, 'p2834-moes-zemismart-action-merge');
    assert.equal(ssot.dualApp, 'BOTH');
  });

  it('detects Moes ZTS + Zemismart ZM16B by suffix', () => {
    const {
      detectBrand,
      shouldMergeActions,
      buildActionPathPlan,
      ACTION_PATH_ORDER,
    } = require(MOD);
    assert.equal(detectBrand('_TZE204_5slehgeo'), 'moes');
    assert.equal(detectBrand('_TZE284_3mzb0sdz'), 'zemismart');
    assert.equal(detectBrand('_TZ3000_unknownxxxx'), null);
    assert.ok(shouldMergeActions(null, {
      mfr: '_TZE204_5slehgeo',
      modelId: 'TS0601',
      protocol: 'HYBRID',
    }));
    const plan = buildActionPathPlan({ preferDpTx: true });
    assert.ok(plan.includes('zcl'));
    assert.ok(plan.includes('tuya_dp'));
    assert.ok(plan.includes('raw_frame'));
    assert.ok(plan.includes('dp_detect'));
    assert.deepEqual(ACTION_PATH_ORDER.slice().sort(), plan.slice().sort());
  });

  it('Contre quoi: sacred zcl_only never gets DP race', () => {
    const { shouldMergeActions, enrichProtocolInfo, buildWriteOpts } = require(MOD);
    const info = {
      mfr: '_TZ3000_a37eix1s',
      modelId: 'TS0002',
      protocol: 'zcl_only',
    };
    assert.equal(shouldMergeActions({}, info), false);
    const enriched = enrichProtocolInfo({ ...info }, {});
    assert.equal(enriched.brandActionMerge.enabled, false);
    assert.notEqual(enriched.parallelDiscover, true);
    const opts = buildWriteOpts({
      _protocolInfo: info,
      _manufacturerConfig: { protocol: 'zcl_only', brand: 'Zemismart' },
      gangCount: 2,
    }, {});
    assert.notEqual(opts.parallelDiscover, true);
  });

  it('buildWriteOpts arms parallelDiscover + raw-ef00 for Moes HYBRID', () => {
    const { buildWriteOpts, applyBrandActionMerge } = require(MOD);
    const device = {
      _protocolInfo: {
        mfr: '_TZE204_5slehgeo',
        modelId: 'TS0601',
        protocol: 'HYBRID',
        preferDpTx: true,
      },
      gangCount: 1,
      getStoreValue: () => ({}),
      setStoreValue: async () => {},
    };
    applyBrandActionMerge(device, device._protocolInfo);
    assert.equal(device._brandActionMerge?.enabled, true);
    assert.equal(device._parallelDiscover, true);
    const opts = buildWriteOpts(device, { endpoint: 1, dpId: 1, dpType: 'bool' });
    assert.equal(opts.parallelDiscover, true);
    assert.ok((opts.extraSteps || []).some((s) => s.name === 'raw-ef00-frame'));
  });

  it('wires stay in protocol detect + CCR + pathfinder + switch base', () => {
    const detect = fs.readFileSync(
      path.join(ROOT, 'lib', 'protocol', 'IntelligentProtocolDetect.js'),
      'utf8',
    );
    const ccr = fs.readFileSync(
      path.join(ROOT, 'lib', 'zigbee', 'CapabilityCommandRouter.js'),
      'utf8',
    );
    const pathFinder = fs.readFileSync(
      path.join(ROOT, 'lib', 'protocol', 'CommunicationPathFinder.js'),
      'utf8',
    );
    const sw = fs.readFileSync(
      path.join(ROOT, 'lib', 'devices', 'UnifiedSwitchBase.js'),
      'utf8',
    );
    assert.match(detect, /MoesZemismartActionMerge/);
    assert.match(detect, /applyBrandActionMerge/);
    assert.match(ccr, /MoesZemismartActionMerge/);
    assert.match(ccr, /buildWriteOpts/);
    assert.match(pathFinder, /rankPathBoost/);
    assert.match(sw, /_brandActionMerge/);
  });
});
