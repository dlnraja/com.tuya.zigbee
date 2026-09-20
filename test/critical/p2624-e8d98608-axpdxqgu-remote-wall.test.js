'use strict';

/**
 * P2624 — Bastien diag e8d98608 Contre quoi
 * CI ReferenceError on remote_button_wireless_wall + invalid button_scene_recall
 * + axpdxqgu+TS0041 sacred couple on button_wireless_1.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2624 e8d98608 remote wall / axpdxqgu TS0041', () => {
  it('remote_button_wireless_wall device.js never references bare CI.containsCI', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless_wall/device.js'),
      'utf8',
    );
    assert.ok(!/\bCI\.containsCI\b/.test(src), 'CI.containsCI crashes onNodeInit');
    assert.ok(src.includes('containsCI'));
    assert.ok(src.includes('CaseInsensitiveMatcher'));
  });

  it('ButtonDevice does not raw-get undeclared button_scene_recall', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(!/getDeviceTriggerCard\(\s*['"]button_scene_recall['"]\s*\)/.test(src));
  });

  it('remote wall flow cards use short readable IDs (not Athom 5-hex hashes)', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless_wall/driver.flow.compose.json'),
      'utf8',
    ));
    const ids = (flow.triggers || []).map((t) => t.id);
    assert.ok(ids.includes('remote_button_wireless_wall_btn1_pressed'));
    assert.ok(ids.includes('remote_button_wireless_wall_btn1_release'));
    assert.ok(ids.includes('remote_button_wireless_wall_scene_recall'));
    assert.ok(!ids.some((id) => /_but_[a-f0-9]{5}$/i.test(id)), 'hashed but_XXXXX forbidden');
  });

  it('sacred couple _TZ3000_axpdxqgu+TS0041 locks on button_wireless_1 not remote wall', () => {
    const bw = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'),
      'utf8',
    ));
    const remote = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless_wall/driver.compose.json'),
      'utf8',
    ));
    const has = (c, mfr, pid) => {
      const m = (c.zigbee?.manufacturerName || []).some((x) => /axpdxqgu/i.test(String(x)));
      const p = (c.zigbee?.productId || []).includes(pid);
      return m && p;
    };
    assert.ok(has(bw, '_TZ3000_axpdxqgu', 'TS0041'));
    assert.ok(!(remote.zigbee?.manufacturerName || []).some((x) => /axpdxqgu/i.test(String(x))));
    const reg = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'data/user-misattribution-registry.json'),
      'utf8',
    ));
    const entry = (reg.cases || []).find((c) => c && c.id === 'p2624-axpdxqgu-ts0041-button-wireless-1-not-remote-wall');
    assert.ok(entry);
    assert.equal(entry.canonicalDriver, 'button_wireless_1');
  });

  it('npm check:p2624 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2624']);
  });
});
