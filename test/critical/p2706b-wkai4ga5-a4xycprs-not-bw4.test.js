'use strict';

/**
 * P2706b — publish heal Contre quoi
 * Anti-bot: wkai4ga5 + a4xycprs+TS0044 belong in scene_switch_4 only
 * (P2328 / P2312). Contre quoi: re-inject into button_wireless_4 blocks Auto-Publish.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2706b wkai4ga5/a4xycprs not on button_wireless_4', () => {
  it('button_wireless_4 must not list wkai4ga5 or a4xycprs', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_4/driver.compose.json'), 'utf8'));
    const mfrs = (c.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(!mfrs.some((m) => m.includes('wkai4ga5')), 'wkai4ga5 → scene_switch_4');
    assert.ok(!mfrs.some((m) => m.includes('a4xycprs')), 'a4xycprs → scene_switch_4');
  });

  it('scene_switch_4 still pins both couples', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/scene_switch_4/driver.compose.json'), 'utf8'));
    const mfrs = (c.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.some((m) => m.includes('wkai4ga5')));
    assert.ok(mfrs.some((m) => m.includes('a4xycprs')));
    assert.ok((c.zigbee?.productId || []).includes('TS0044'));
  });
});
