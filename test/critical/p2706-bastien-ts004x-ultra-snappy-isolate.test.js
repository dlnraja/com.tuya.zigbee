'use strict';

/**
 * P2706 — Bastien instant msgs Contre quoi
 * (tightened by P2707 lean Flow — debounce ≤40 still required)
 *
 * Contre quoi:
 * - debounce ≥80 / await card-cascade on snappy → cross-device Flow lag + crash
 * - UI pulse on multi-gang snappy → setCapability storm
 * - CR2032 voltage curve ceiling ~84% for vsxvaj9i
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2706 Bastien TS004x ultra-snappy + isolate + battery', () => {
  it('dzwgk7e2 / vsxvaj9i / axpdxqgu: debounce≤40 + skipUiPulse on multi', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    for (const key of ["'_TZ3000_dzwgk7e2'", "'_TZ3000_vsxvaj9i'"]) {
      const idx = src.indexOf(key);
      assert.ok(idx >= 0, `${key} profile`);
      const block = src.slice(idx, idx + 900);
      const dm = block.match(/debounceMs:\s*(\d+)/);
      assert.ok(dm && Number(dm[1]) <= 40, `${key} debounce≤40 got ${dm && dm[1]}`);
      const cp = block.match(/crossPathDedupMs:\s*(\d+)/);
      assert.ok(cp && Number(cp[1]) <= 60, `${key} crossPath≤60`);
      assert.match(block, /snappyRelayFlow:\s*true/);
      assert.match(block, /skipUiPulse:\s*true/);
      assert.match(block, /zcl200IsPercent:\s*true/);
    }
    const aIdx = src.indexOf("'_TZ3000_axpdxqgu'");
    assert.ok(aIdx >= 0);
    const aBlock = src.slice(aIdx, aIdx + 800);
    const adm = aBlock.match(/debounceMs:\s*(\d+)/);
    assert.ok(adm && Number(adm[1]) <= 40);
    assert.match(aBlock, /snappyRelayFlow:\s*true/);
  });

  it('ButtonDevice: snappy does not await card cascade (isolate TS0041)', () => {
    const btn = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.match(btn, /runCardCascade/);
    // P2707: lean primary Flow for snappy (not full cascade void)
    assert.match(btn, /if \(snappy\)/);
    assert.match(btn, /triggerFlowCardHeuristic|void runCardCascade/);
    assert.match(btn, /skipUiPulse/);
    assert.match(btn, /minInterval = 25/);
    assert.match(btn, /never let CR2032 voltage curve/);
    assert.match(btn, /zcl200IsPercent \|\| context\.profile\?\.skipBatteryReporting/);
  });

  it('WallSceneRemoteHybrid: fire-and-forget onPress (no await trigger)', () => {
    const wall = fs.readFileSync(
      path.join(ROOT, 'lib/devices/WallSceneRemoteHybridInit.js'), 'utf8');
    assert.match(wall, /never await triggerButtonPress/);
    assert.match(wall, /path-agnostic key/);
    assert.doesNotMatch(wall, /await device\.triggerButtonPress/);
  });

  it('PhysicalButtonMixin: snappy dispatch does not await triggerButtonPress', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /snappyRelayFlow[\s\S]{0,120}triggerButtonPress/);
    assert.match(src, /isolates TS0041/);
  });

  it('battery map: vsxvaj9i + dzwgk7e2 direct ZCL % (not voltage curve)', () => {
    const bat = fs.readFileSync(
      path.join(ROOT, 'lib/battery/UnifiedBatteryHandler.js'), 'utf8');
    assert.match(bat, /'_TZ3000_vsxvaj9i'[\s\S]{0,120}algorithm: 'direct'/);
    assert.match(bat, /'_TZ3000_dzwgk7e2'[\s\S]{0,120}algorithm: 'direct'/);
  });

  it('bw2/bw3 device profiles force debounce≤40 + skipUiPulse', () => {
    const d2 = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_2/device.js'), 'utf8');
    const d3 = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_3/device.js'), 'utf8');
    const d2m = d2.match(/debounceMs:\s*(\d+)/);
    assert.ok(d2m && Number(d2m[1]) <= 40);
    assert.match(d2, /skipUiPulse:\s*true/);
    assert.match(d3, /debounceMs: Math\.min\(Number\(base\.debounceMs\) \|\| (?:25|40), (?:25|40)\)/);
    assert.match(d3, /skipUiPulse:\s*true/);
  });
});
