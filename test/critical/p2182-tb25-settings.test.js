'use strict';

/**
 * P2182 — TB25 / NovaDigital wall-switch settings (Gabriel #2182).
 * Ideas only from field notes: sibling labels, EP1-only config, rejoin
 * re-apply, pulse/inching. No countdown. No invented 606/808/ZMS-206 pids.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');
const { isConfigSettingKey } = require('../../lib/zigbee/ZclSwitchConfigPolicy');

describe('P2182 TB25 wall-switch settings', () => {
  it('treats backlight/switch_mode/inching as EP1 config keys', () => {
    assert.strictEqual(isConfigSettingKey('backlight_mode'), true);
    assert.strictEqual(isConfigSettingKey('switch_mode'), true);
    assert.strictEqual(isConfigSettingKey('inching'), true);
    assert.strictEqual(isConfigSettingKey('connected_siblings'), false);
  });

  it('UnifiedSwitchBase skips sub-device config writes and re-applies on rejoin', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSwitchBase.js'), 'utf8');
    assert.match(src, /_isSwitchSubDevice/);
    assert.match(src, /skip \$\{key\} on sub-device/);
    assert.match(src, /onEndDeviceAnnounce/);
    assert.match(src, /_pushConfiguredSwitchSettings\('rejoin'\)/);
    assert.match(src, /_refreshConnectedSwitchLabels/);
  });

  it('2-gang subdevice driver declares sibling label + inching, no countdown', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/wall_switch_2gang_1way/driver.compose.json'),
      'utf8'
    ));
    const ids = [];
    for (const g of compose.settings || []) {
      for (const c of g.children || []) {ids.push(c.id);}
    }
    assert.ok(ids.includes('connected_siblings'));
    assert.ok(ids.includes('traffic_stats'));
    assert.ok(ids.includes('inching'));
    assert.ok(ids.includes('backlight_mode'));
    assert.ok(!ids.includes('countdown'));
    // WHY(P2455 68de05268b): new pairs are one device with onoff + onoff.gang2 (no secondSwitch
    // sub-device); already-paired legacy secondSwitch instances are still handled in device.js.
    assert.ok(!(compose.devices && compose.devices.secondSwitch));
    assert.ok((compose.capabilities || []).includes('onoff.gang2'));
    assert.match(fs.readFileSync(path.join(ROOT, 'drivers/wall_switch_2gang_1way/device.js'), 'utf8'), /subDeviceId === 'secondSwitch'/);
  });

  it('3-gang subdevice driver is TS0003/TS0013 only and has sibling + inching, no countdown', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/wall_switch_3gang_1way/driver.compose.json'),
      'utf8'
    ));
    const ids = [];
    for (const g of compose.settings || []) {
      for (const c of g.children || []) {ids.push(c.id);}
    }
    // WHY(P2464/P2465 ff11815887): Moes Star Feather 3-gang (Z2M _TZE200_zo0cfekv/tzyy0rtq/rd8cdssd + TS0601)
    // lives here; TS0601 is allowed only for EF00 _TZE* manufacturers.
    const pids = [...(compose.zigbee.productId || [])].sort();
    assert.ok(pids.includes('TS0003') && pids.includes('TS0013'));
    assert.ok(pids.every((p) => ['TS0003', 'TS0013', 'TS0601'].includes(p)), pids.join(','));
    if (pids.includes('TS0601')) {
      assert.ok(compose.zigbee.manufacturerName.some((m) => /^_tze200_zo0cfekv$/i.test(m)));
    }
    assert.ok(ids.includes('connected_siblings'));
    assert.ok(ids.includes('traffic_stats'));
    assert.ok(ids.includes('inching'));
    assert.ok(!ids.includes('countdown'));
    assert.ok(compose.devices && compose.devices.secondSwitch && compose.devices.thirdSwitch);
  });

  it('forum PM harvest scripts never POST replies', () => {
    const readOnly = fs.readFileSync(path.join(ROOT, 'tools/ci/forum-pm-read-only.js'), 'utf8');
    const scanner = fs.readFileSync(path.join(ROOT, '.github/scripts/forum-pm-scanner.js'), 'utf8');
    assert.doesNotMatch(readOnly, /method:\s*['"]POST['"]/);
    assert.doesNotMatch(scanner, /FORUM\+'\/posts'/);
    assert.match(readOnly, /read-only-never-post/);
  });

  it('4-gang ZCL wall driver is TS0004 family only and has sibling + inching', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/wall_switch_4gang_1way/driver.compose.json'),
      'utf8'
    ));
    const ids = [];
    for (const g of compose.settings || []) {
      for (const c of g.children || []) {ids.push(c.id);}
    }
    const pids = compose.zigbee.productId || [];
    assert.ok(pids.includes('TS0004'));
    assert.ok(pids.includes('TS0726'));
    assert.ok(!pids.includes('TS0601'));
    assert.ok(!pids.includes('TS0001'));
    assert.ok(ids.includes('connected_siblings'));
    assert.ok(ids.includes('inching'));
    assert.ok(!ids.includes('countdown'));
    assert.ok(compose.devices && compose.devices.fourthSwitch);
  });
});
