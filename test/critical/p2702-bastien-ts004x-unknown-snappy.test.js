'use strict';

/**
 * P2702 — Bastien diag 1f4dcf2e @ v1.0.76 Contre quoi
 *
 * User: TS0041 + TS0043 « toujours inconnue »; TS0042 button→relay « trop lent ».
 *
 * Contre quoi:
 * - button_wireless_2 productId still lists TS0041 → steals Bouton 1 pairing
 * - axpdxqgu+TS0041 / vsxvaj9i+TS0043 missing from sacred-keep → compact drop
 * - dzwgk7e2 debounce ≥200ms + await button pulse before Flow → relay lag
 * Dual-app: BOTH + Bastien tip
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2702 Bastien TS0041/42/43 unknown + snappy relay', () => {
  it('button_wireless_2 must NOT list productId TS0041 (pairing bleed)', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_2/driver.compose.json'), 'utf8'));
    assert.ok(!(c.zigbee.productId || []).includes('TS0041'),
      'TS0041 on bw2 steals axpdxqgu Unknown Node pairing');
    assert.ok((c.zigbee.productId || []).includes('TS0042'));
    assert.ok((c.zigbee.manufacturerName || []).some((m) => /dzwgk7e2/i.test(m)));
  });

  it('sacred-keep pins axpdxqgu+TS0041 and vsxvaj9i+TS0043', () => {
    const j = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'));
    const couples = j.couples || [];
    const has = (mfr, pid) => couples.some((c) =>
      String(c.mfr).toLowerCase() === mfr.toLowerCase() && String(c.pid) === pid);
    assert.ok(has('_TZ3000_axpdxqgu', 'TS0041'), 'axpdxqgu sacred-keep');
    assert.ok(has('_TZ3000_vsxvaj9i', 'TS0043'), 'vsxvaj9i sacred-keep');
    assert.ok(has('_TZ3000_dzwgk7e2', 'TS0042'), 'dzwgk7e2 still pinned');
  });

  it('dzwgk7e2 / vsxvaj9i / axpdxqgu profiles: debounce≤80 + snappyRelayFlow', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    for (const key of ["'_TZ3000_dzwgk7e2'", "'_TZ3000_vsxvaj9i'", "'_TZ3000_axpdxqgu'"]) {
      const idx = src.indexOf(key);
      assert.ok(idx >= 0, `${key} profile`);
      const block = src.slice(idx, idx + 750);
      assert.match(block, /debounceMs:\s*80/);
      assert.match(block, /crossPathDedupMs:\s*120/);
      assert.match(block, /snappyRelayFlow:\s*true/);
    }
  });

  it('button_wireless_2 forces debounce 80 + ButtonDevice fires Flow before pulse', () => {
    const d2 = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_2/device.js'), 'utf8');
    assert.match(d2, /debounceMs:\s*80/);
    assert.match(d2, /snappyRelayFlow:\s*true/);

    const btn = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    const flowIdx = btn.indexOf('[BUTTON-FLOW] triggerButtonPress');
    const pulseIdx = btn.indexOf('capsToPulse');
    assert.ok(flowIdx > 0 && pulseIdx > 0);
    // WHY: Flow log must appear before capsToPulse block that starts the UI pulse
    assert.ok(flowIdx < pulseIdx, 'Flow must start before capability pulse');
    assert.match(btn, /snappyRelayFlow/);
    assert.match(btn, /minInterval = 50/);
  });

  it('compose locks axpdxqgu→bw1 and vsxvaj9i→bw3', () => {
    const b1 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'), 'utf8'));
    const b3 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8'));
    assert.ok((b1.zigbee.manufacturerName || []).some((m) => /axpdxqgu/i.test(m)));
    assert.ok((b1.zigbee.productId || []).includes('TS0041'));
    assert.ok((b3.zigbee.manufacturerName || []).some((m) => /vsxvaj9i/i.test(m)));
    assert.ok((b3.zigbee.productId || []).includes('TS0043'));
  });
});
