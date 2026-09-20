'use strict';

/**
 * P2632 — HOBEIAN ZG-301Z auto-off Contre quoi
 * P2633 — adndolvx+TS0041 phantom-EP firmware Contre quoi (HA T455202)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2632 HOBEIAN ZG-301Z countdown / switch_type', () => {
  it('heal helper exists and exports clear + force state', () => {
    const heal = require(path.join(ROOT, 'lib/tuya/HobeianZg301zHeal.js'));
    assert.equal(typeof heal.healHobeianZg301z, 'function');
    assert.equal(typeof heal.clearOnTimeCountdown, 'function');
    assert.equal(typeof heal.forceSwitchTypeState, 'function');
  });

  it('switch_1gang device.js wires P2632 heal', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/switch_1gang/device.js'), 'utf8');
    assert.ok(src.includes('healHobeianZg301z'));
    assert.ok(src.includes('P2632'));
    assert.ok(src.includes('HobeianZg301zHeal'));
  });

  it('switch_1gang has switch_mode setting default state', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/switch_1gang/driver.compose.json'),
      'utf8',
    ));
    const sm = (c.settings || []).find((s) => s && s.id === 'switch_mode');
    assert.ok(sm, 'switch_mode setting required');
    assert.equal(sm.value, 'state');
    assert.ok((sm.values || []).some((v) => v.id === 'momentary'));
  });

  it('switch_1gang locks HOBEIAN+ZG-301Z; curtain must not steal', () => {
    const sw = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/switch_1gang/driver.compose.json'),
      'utf8',
    ));
    const curtain = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'),
      'utf8',
    ));
    assert.ok((sw.zigbee.manufacturerName || []).some((x) => /hobeian/i.test(String(x))));
    assert.ok((sw.zigbee.productId || []).includes('ZG-301Z'));
    assert.ok(!(curtain.zigbee.productId || []).includes('ZG-301Z'));
  });
});

describe('P2633 adndolvx+TS0041 phantom EP firmware (HA)', () => {
  it('button_wireless_1 locks adndolvx case forms + TS0041', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'),
      'utf8',
    ));
    assert.ok((c.zigbee.manufacturerName || []).some((x) => /adndolvx/i.test(String(x))));
    assert.ok((c.zigbee.productId || []).includes('TS0041'));
  });

  it('device.js collapses phantom EPs for TS0041 / adndolvx', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_1/device.js'), 'utf8');
    assert.ok(src.includes('collapsePhantomEndpoints'));
    assert.ok(src.includes('adndolvx'));
    assert.ok(src.includes('P2633'));
  });

  it('P2639 mixin sticky adndolvx + siblings itb0omhv/x7mej5oc (HA T455202)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes("'_TZ3000_adndolvx'"));
    assert.ok(src.includes("'_TZ3000_itb0omhv'"));
    assert.ok(src.includes("'_TZ3000_x7mej5oc'"));
    assert.ok(/'_TZ3000_adndolvx':\s*\{[\s\S]*?phantomEpFirmware:\s*true/.test(src));
    assert.ok(/'_TZ3000_adndolvx':\s*\{[\s\S]*?mapAllEndpointsToButton1:\s*true/.test(src));
    assert.ok(/'_TZ3000_adndolvx':\s*\{[\s\S]*?buttonCount:\s*1/.test(src));
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'),
      'utf8',
    ));
    assert.ok((c.zigbee.manufacturerName || []).some((x) => /itb0omhv/i.test(String(x))));
    assert.ok((c.zigbee.manufacturerName || []).some((x) => /x7mej5oc/i.test(String(x))));
    // Contre quoi: must not be stolen by 4-gang button driver
    const b4 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_4/driver.compose.json'),
      'utf8',
    ));
    assert.ok(!(b4.zigbee.manufacturerName || []).some((x) => /adndolvx/i.test(String(x))));
  });

  it('npm scripts wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2632'] || pkg.scripts['check:p263x']);
  });
});
