'use strict';

/**
 * P2645 — Bastien 4d4e1684 complementary reflection
 * Contre quoi: sleepy remotes get battery configureReporting / getOnStart while asleep
 * → "Impossible de joindre" + mute buttons; Time 0x000A L0 spam in diags.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2645 sleepy remote pairing / time cluster', () => {
  it('BaseUnifiedDevice forces skip battery cfg for button drivers + getOnStart false', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8');
    assert.ok(src.includes('P2470/P2645'));
    assert.ok(src.includes('getOnStart: false'));
    assert.ok(src.includes('getOnOnline: false'));
    assert.ok(src.includes('isSleepyRemote'));
    assert.ok(src.includes('isButtonDriver'));
  });

  it('TuyaZigbeeDevice quiets Time 0x000A L0 spam', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.ok(src.includes('quietCluster'));
    assert.ok(/0x000a/i.test(src));
    assert.ok(src.includes('P2645'));
  });

  it('button_wireless_1/3 profiles set skipBatteryReporting', () => {
    for (const id of ['button_wireless_1', 'button_wireless_3']) {
      const src = fs.readFileSync(path.join(ROOT, `drivers/${id}/device.js`), 'utf8');
      assert.ok(src.includes('skipBatteryReporting: true'), id);
    }
  });

  it('PhysicalButtonMixin unknown fallback skips battery reporting', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('P2645'));
    assert.ok(/unknown[\s\S]{0,200}skipBatteryReporting:\s*true/.test(src));
  });
});
