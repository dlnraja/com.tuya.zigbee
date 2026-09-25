'use strict';

/**
 * P2707 — Bastien black TS0042/43 Homey crash Contre quoi
 *
 * User: « Les bouton noir don ts 0042 etts0043 font crash l’application parfois »
 *
 * Contre quoi:
 * - snappy still runs full tryOnce cascade → OOM / Homey crash
 * - HomeyButtonUiCharter sync on multi-gang snappy
 * - voltage battery listener storms on vsxvaj9i
 * Dual-app: BOTH + Bastien tip priority
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2707 Bastien black TS0042/43 crash-safe', () => {
  it('ButtonDevice snappy uses lean primary Flow — not full runCardCascade', () => {
    const btn = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.match(btn, /P2707 \/ Bastien black TS0042\/43 crash/);
    assert.match(btn, /triggerFlowCardHeuristic/);
    // Contre quoi: must NOT void the full cascade on snappy anymore
    const snappyBlock = btn.slice(btn.indexOf('if (snappy)'), btn.indexOf('await runCardCascade()'));
    assert.ok(snappyBlock.includes('triggerFlowCardHeuristic'));
    assert.ok(!snappyBlock.includes('void runCardCascade()'),
      'snappy must not fire full tryOnce cascade');
  });

  it('PhysicalButtonMixin soft-pulses UI on skipUiPulse (P2734 bi-dir)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /softPulsePhysicalUi|P2734/);
    assert.match(src, /softOnly/);
    const dzw = src.slice(src.indexOf("'_TZ3000_dzwgk7e2'"), src.indexOf("'_TZ3000_dzwgk7e2'") + 800);
    assert.match(dzw, /debounceMs:\s*25/);
    assert.match(dzw, /skipUiPulse:\s*true/);
  });

  it('WallSceneRemoteHybrid: softPulse when skipUiPulse (never await full charter)', () => {
    const wall = fs.readFileSync(
      path.join(ROOT, 'lib/devices/WallSceneRemoteHybridInit.js'), 'utf8');
    assert.match(wall, /softPulsePhysicalUi/);
    assert.match(wall, /skipUiPulse/);
    assert.doesNotMatch(wall, /await Promise\.resolve\(syncPhysicalToHomeyUi/);
  });

  it('ZclBatteryMonitor skips voltage on zcl200IsPercent / skipBatteryReporting', () => {
    const mon = fs.readFileSync(path.join(ROOT, 'lib/battery/ZclBatteryMonitor.js'), 'utf8');
    assert.match(mon, /skipVoltage/);
    assert.match(mon, /zcl200IsPercent/);
    assert.match(mon, /if \(!skipVoltage\)/);
  });

  it('bw2/bw3 profiles force debounce 25 + skipUiPulse', () => {
    const d2 = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_2/device.js'), 'utf8');
    const d3 = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_3/device.js'), 'utf8');
    assert.match(d2, /debounceMs:\s*25/);
    assert.match(d2, /skipUiPulse:\s*true/);
    assert.match(d3, /debounceMs: Math\.min\(Number\(base\.debounceMs\) \|\| 25, 25\)/);
    assert.match(d3, /skipUiPulse:\s*true/);
  });
});
