'use strict';

/**
 * P2638 — Z2M#25720 + ZHA gist + Bastien axpdxqgu Contre quoi
 * Cross-ref: herdsman TS0041 on_off_action, ZHA TuyaSmartRemote0041TO,
 * SmartHomeScene Moes Star Ring, XiaomiGateway3 0xFD map.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2638 axpdxqgu Z2M/ZHA adaptive lock', () => {
  it('PRESS_MAP 0/1/2 = single/double/long (Z2M hold + ZHA remote_button_*)', () => {
    const { PRESS_MAP, resolve } = require(path.join(ROOT, 'lib/utils/TuyaPressTypeMap'));
    assert.equal(PRESS_MAP[0], 'single');
    assert.equal(PRESS_MAP[1], 'double');
    assert.equal(PRESS_MAP[2], 'long');
    assert.equal(resolve('hold'), 'long');
    assert.equal(resolve('remote_button_short_press'), 'single');
    assert.equal(resolve('remote_button_double_press'), 'double');
    assert.equal(resolve('remote_button_long_press'), 'long');
    assert.equal(resolve('button_single'), 'single');
  });

  it('PhysicalButtonMixin axpdxqgu sticky: no E000, skip battery reporting, 1 btn', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes("'_TZ3000_axpdxqgu'"));
    assert.ok(/'_TZ3000_axpdxqgu':\s*\{[\s\S]*?usesE000:\s*false/.test(src));
    assert.ok(/'_TZ3000_axpdxqgu':\s*\{[\s\S]*?skipBatteryReporting:\s*true/.test(src));
    assert.ok(/'_TZ3000_axpdxqgu':\s*\{[\s\S]*?buttonCount:\s*1/.test(src));
    assert.ok(src.includes('P2638'));
  });

  it('button_wireless_1: CR2032 for axpdxqgu + no onoff capability (event remote)', () => {
    const device = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_1/device.js'), 'utf8');
    assert.ok(device.includes('P2638'));
    assert.ok(/axpdxqgu[\s\S]*CR2032/.test(device));
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'),
      'utf8',
    ));
    assert.ok(!(compose.capabilities || []).includes('onoff'));
    assert.ok((compose.capabilities || []).includes('button.1'));
    assert.ok((compose.zigbee.manufacturerName || []).some((x) => /axpdxqgu/i.test(String(x))));
  });

  it('Flow triggers exist for single/double/long — Homey analogue of MQTT device trigger (#25720)', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.flow.compose.json'),
      'utf8',
    ));
    const ids = (flow.triggers || []).map((t) => t.id);
    assert.ok(ids.some((id) => /button_pressed$/.test(id) || /_pressed$/.test(id)));
    assert.ok(ids.some((id) => /double/.test(id)));
    assert.ok(ids.some((id) => /long_press/.test(id)));
    // Contre quoi sticky action entity (Z2M 2.0 HA break): no capability named action
    assert.ok(!(composeHasAction()));
    function composeHasAction() {
      const c = JSON.parse(fs.readFileSync(
        path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'),
        'utf8',
      ));
      return (c.capabilities || []).some((x) => String(x) === 'action' || /^action\./.test(String(x)));
    }
  });

  it('battery handler maps axpdxqgu → CR2032', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/battery/UnifiedBatteryHandler.js'), 'utf8');
    assert.ok(/axpdxqgu[\s\S]{0,80}CR2032/.test(src));
  });

  it('npm check:p2638 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2638']);
  });
});
