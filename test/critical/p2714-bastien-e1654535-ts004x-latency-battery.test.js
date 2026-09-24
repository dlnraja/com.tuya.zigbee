'use strict';

/**
 * P2714 — Bastien diags 1f4dcf2e @1.0.76 + e1654535 @1.0.80 Contre quoi
 *
 * Couples: _TZ3000_dzwgk7e2+TS0042, _TZ3000_vsxvaj9i+TS0043 (TS0041 OK @ tip)
 * Contre quoi:
 * - class fallback debounce 80 + default appWindow → TS0042/43 slower than TS0041
 * - bootstrap seed arms debounce → eats next press
 * - Invalid Capability measure_battery spam / CPU crash path
 * Dual-app: BOTH (Bastien tip priority)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2714 Bastien e1654535 TS004x latency + battery', () => {
  it('ts004RemoteFallback is snappy (≤40 debounce, snappyRelayFlow, appWindow≤180)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    const idx = src.indexOf('const ts004RemoteFallback');
    assert.ok(idx > 0);
    const block = src.slice(idx, idx + 2200);
    assert.match(block, /debounceMs:\s*25/);
    assert.match(block, /crossPathDedupMs:\s*40/);
    assert.match(block, /appCommandWindow:\s*180/);
    assert.match(block, /snappyRelayFlow:\s*true/);
    assert.match(block, /P2714_/);
    assert.doesNotMatch(block, /debounceMs:\s*80/);
  });

  it('ZCL + DP attribute handlers seed bootstrap before debounce', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    const zclStart = src.indexOf('  _handleAttributeReport(gang, value, data) {');
    assert.ok(zclStart > 0);
    const zcl = src.slice(zclStart, zclStart + 4500);
    const seedZ = zcl.indexOf('bootstrap seed');
    const debZ = zcl.indexOf('if (this._isDebounced(gang))');
    assert.ok(seedZ > 0 && debZ > seedZ, 'ZCL: seed before debounce');

    const dpStart = src.indexOf('  _handleTuyaDPReport(gang, value) {');
    assert.ok(dpStart > 0);
    const dp = src.slice(dpStart, dpStart + 2500);
    const seedD = dp.indexOf('bootstrap seed');
    const debD = dp.indexOf('if (this._isDebounced(gang))');
    assert.ok(seedD > 0 && debD > seedD, 'DP: seed before debounce');
  });

  it('Invalid Capability is expected soft-fail; bw2/bw3 rehydrate battery', () => {
    const base = fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8');
    assert.match(base, /invalid capability/);

    const d2 = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_2/device.js'), 'utf8');
    const d3 = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_3/device.js'), 'utf8');
    assert.match(d2, /P2714 rehydrate measure_battery/);
    assert.match(d3, /P2714 rehydrate measure_battery/);
    assert.match(d2, /appCommandWindow:\s*180/);
  });

  it('npm check:p2714 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.match(String(pkg.scripts['check:p2714'] || ''), /p2714-bastien-e1654535/);
  });
});
