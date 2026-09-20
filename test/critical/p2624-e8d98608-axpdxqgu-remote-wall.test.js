'use strict';

/**
 * P2624 — master BOTH mirror of Bastien diag e8d98608
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2624 e8d98608 (master)', () => {
  it('no CI.containsCI crash on remote_button_wireless_wall', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless_wall/device.js'),
      'utf8',
    );
    assert.ok(!/\bCI\.containsCI\b/.test(src));
    assert.ok(src.includes('containsCI'));
  });

  it('no raw button_scene_recall getDeviceTriggerCard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(!/getDeviceTriggerCard\(\s*['"]button_scene_recall['"]\s*\)/.test(src));
  });

  it('axpdxqgu+TS0041 on button_wireless_1', () => {
    const bw = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'),
      'utf8',
    ));
    assert.ok((bw.zigbee.manufacturerName || []).some((m) => /axpdxqgu/i.test(m)));
    assert.ok((bw.zigbee.productId || []).includes('TS0041'));
  });
});
