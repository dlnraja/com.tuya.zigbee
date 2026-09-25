'use strict';
/**
 * P2735 — famkxci2+TS0043 snappy parity (GH#551 class)
 *
 * Contre quoi: profile stayed slow (1000ms windows, no snappyRelayFlow/skipUiPulse)
 * while vsxvaj9i/dzwgk7e2 already ultra-snappy — same hardware class regresses on Homey queue.
 * Dual-app: BOTH (+ Bastien tip)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2735 famkxci2 TS0043 snappy parity', () => {
  it('famkxci2 profile matches vsxvaj9i snappy flags', () => {
    const mix = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    const idx = mix.indexOf("'_TZ3000_famkxci2'");
    assert.ok(idx > 0, 'famkxci2 profile present');
    const block = mix.slice(idx, idx + 900);
    assert.match(block, /snappyRelayFlow:\s*true/);
    assert.match(block, /skipUiPulse:\s*true/);
    assert.match(block, /skipBatteryReporting:\s*true/);
    assert.match(block, /debounceMs:\s*25/);
    assert.match(block, /P2735/);
  });

  it('sacred couple stays button_wireless_3 + TS0043 only', () => {
    const compose = fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8');
    assert.ok(compose.includes('_TZ3000_famkxci2'));
    assert.ok(compose.includes('TS0043'));
  });
});
