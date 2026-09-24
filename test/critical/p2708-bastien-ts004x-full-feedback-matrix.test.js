'use strict';

/**
 * P2708 — Bastien full feedback matrix Contre quoi (TS0041/42/43)
 * Locks that tip ≥1.0.82 covers all user symptoms; bw1 ultimate 25ms.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2708 Bastien full TS004x feedback matrix', () => {
  it('TS0041 bw1 debounce≤25 + snappyRelayFlow (ultimate)', () => {
    const d1 = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_1/device.js'), 'utf8');
    assert.match(d1, /debounceMs: Math\.min\(Number\(base\.debounceMs\) \|\| 25, 25\)/);
    assert.match(d1, /snappyRelayFlow:\s*true/);
  });

  it('TS0042/43 crash-safe lean Flow + skipUiPulse + battery direct', () => {
    const btn = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.match(btn, /P2707 \/ Bastien black TS0042\/43 crash/);
    assert.match(btn, /triggerFlowCardHeuristic/);
    const mixin = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    for (const k of ["'_TZ3000_dzwgk7e2'", "'_TZ3000_vsxvaj9i'"]) {
      const b = mixin.slice(mixin.indexOf(k), mixin.indexOf(k) + 900);
      assert.match(b, /debounceMs:\s*25/);
      assert.match(b, /skipUiPulse:\s*true/);
    }
    const bat = fs.readFileSync(path.join(ROOT, 'lib/battery/UnifiedBatteryHandler.js'), 'utf8');
    assert.match(bat, /'_TZ3000_vsxvaj9i'[\s\S]{0,120}algorithm: 'direct'/);
    const mon = fs.readFileSync(path.join(ROOT, 'lib/battery/ZclBatteryMonitor.js'), 'utf8');
    assert.match(mon, /skipVoltage/);
  });

  it('cross-device isolate: hybrid never awaits + mixin snappy no await', () => {
    const wall = fs.readFileSync(path.join(ROOT, 'lib/devices/WallSceneRemoteHybridInit.js'), 'utf8');
    assert.doesNotMatch(wall, /await device\.triggerButtonPress/);
    const mixin = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(mixin, /isolates TS0041/);
    assert.match(mixin, /skipCharter/);
  });
});
