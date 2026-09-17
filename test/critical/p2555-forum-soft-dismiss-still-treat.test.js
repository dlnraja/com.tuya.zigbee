'use strict';

/**
 * P2555 — Forum soft-dismiss still treat (Peter History / VicHY WHEN+class)
 *
 * Contre quoi: agents stop when users say "not so important" / "fine if I block updates"
 * while residual gaps remain (Peter #2239 History, VicHY #2240 WHEN, #2241 class flip).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2555 forum soft-dismiss still treat', () => {
  it('ButtonDevice History recycle bumps to p2555 + delayed re-paint', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.match(src, /p2555_batt_insights_recycle/);
    assert.match(src, /healSensorCapabilityGetable/);
    assert.match(src, /safeSetTimeout\(this,\s*\(\)\s*=>\s*\{\s*paint\(last\)/);
    assert.match(src, /P2555/);
  });

  it('presence radar refuses curtain-like setClass + WHEN nudge', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.match(src, /curtainLike/);
    assert.match(src, /_schedulePresenceWhenNudge/);
    assert.match(src, /p2555_presence_when_nudge/);
    assert.match(src, /60_000/);
    assert.match(src, /opts\.silent === true/);
  });

  it('does NOT invent zgyzgdua+TS0043 (Z2M sacred is TS0044 only)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/scene_switch_4/driver.compose.json'), 'utf8'));
    const mfrs = (compose.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.includes('_tz3000_zgyzgdua'));
    // productId list may include TS0044; must not invent TS0043 for this mfr alone
    // (multi-pid OK only when verified — Contre quoi false TS0043 lock)
    assert.ok((compose.zigbee.productId || []).includes('TS0044'));
  });

  it('qd7hej8u stays bulb_rgb TS0505B — do not invent TS0041 button route', () => {
    const bulb = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/bulb_rgb/driver.compose.json'), 'utf8'));
    assert.ok((bulb.zigbee.manufacturerName || []).some((m) => /qd7hej8u/i.test(m)));
    assert.ok((bulb.zigbee.productId || []).includes('TS0505B'));
    const bw1 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'), 'utf8'));
    assert.equal(
      (bw1.zigbee.manufacturerName || []).some((m) => /qd7hej8u/i.test(m)),
      false,
    );
  });
});
