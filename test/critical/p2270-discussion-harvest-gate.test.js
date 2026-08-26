'use strict';

/**
 * P2270 — Discussion harvest gate
 * WHY: Ensure ≥50 discoveries recorded and PathFinder / lexicon basics stay wired.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { describe, it } = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

describe('P2270 discussion harvest + pathfind', () => {
  it('DISCOVERIES.json has ≥50 items', () => {
    const p = path.join(ROOT, 'reports', 'discussion-harvest-2026-08-26', 'DISCOVERIES.json');
    assert.ok(fs.existsSync(p), 'missing DISCOVERIES.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok((j.discoveries || []).length >= 50, `expected ≥50 got ${(j.discoveries || []).length}`);
  });

  it('CommunicationPathFinder blocks tuya_dp for sacred zcl_only', () => {
    const { rankPaths, bestPath } = require('../../lib/protocol/CommunicationPathFinder');
    const ranked = rankPaths({
      sacredZclOnly: true,
      clustersPresent: [0x0006, 0xEF00],
      capability: 'onoff',
    });
    assert.ok(ranked.length > 0);
    const dp = ranked.find((r) => r.id === 'tuya_dp');
    assert.ok(dp && dp.score < 0, 'tuya_dp must be heavily penalized');
    const best = bestPath({ sacredZclOnly: true, clustersPresent: [0x0006], capability: 'onoff' });
    assert.ok(best && best.id !== 'tuya_dp');
  });

  it('ZclClusterLexicon resolves E002 as manuSpecificTuya2', () => {
    const { lookupCluster } = require('../../lib/zigbee/ZclClusterLexicon');
    const a = lookupCluster(0xE002);
    const b = lookupCluster('manuSpecificTuya2');
    assert.strictEqual(a.id, 0xE002);
    assert.strictEqual(b.id, 0xE002);
  });

  it('BatteryMasterEngine LowLevelBridge path is parent-relative', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'battery', 'BatteryMasterEngine.js'), 'utf8');
    assert.ok(!src.includes("require('./LowLevelBridge')"), 'broken ./LowLevelBridge must be gone');
    assert.ok(src.includes("require('../LowLevelBridge')"), 'expected ../LowLevelBridge');
  });

  it('compose locks P2270 couples', () => {
    const knob = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'smart_knob', 'driver.compose.json'), 'utf8'));
    assert.ok((knob.zigbee.manufacturerName || []).some((m) => /402vrq2i/i.test(m)));
    const metering = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'switch_4_gang_metering', 'driver.compose.json'), 'utf8'));
    assert.ok(!(metering.zigbee.manufacturerName || []).some((m) => /402vrq2i/i.test(m)));
    const sw1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'switch_1gang', 'driver.compose.json'), 'utf8'));
    assert.ok(!(sw1.zigbee.manufacturerName || []).some((m) => /hlx9tnzb/i.test(m)));
  });
});
