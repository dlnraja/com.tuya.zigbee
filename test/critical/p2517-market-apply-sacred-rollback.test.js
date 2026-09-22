'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('P2517 market-apply sacred-couple rollback', () => {
  it('krwtzhfd+TS004F not on water_leak_sensor or button_wireless_4 (NEED_INTERVIEW)', () => {
    const leak = JSON.parse(read('drivers/water_leak_sensor/driver.compose.json'));
    assert.ok(!(leak.zigbee.manufacturerName || []).some((m) => /krwtzhfd/i.test(m)));
    const btn = JSON.parse(read('drivers/button_wireless_4/driver.compose.json'));
    assert.ok(!(btn.zigbee.manufacturerName || []).some((m) => /krwtzhfd/i.test(m)));
    const reg = JSON.parse(read('data/user-misattribution-registry.json'));
    const c = (reg.cases || []).find((x) => x.id === 'p2517-krwtzhfd-ts004f-not-leak');
    assert.ok(c?.doNotLock === true);
  });

  it('t7ugva7q on wall_switch_3gang_1way not switch_3gang', () => {
    const wall = JSON.parse(read('drivers/wall_switch_3gang_1way/driver.compose.json'));
    assert.ok((wall.zigbee.manufacturerName || []).some((m) => /t7ugva7q/i.test(m)));
    assert.ok((wall.zigbee.productId || []).includes('TS0013'));
    const sw3 = JSON.parse(read('drivers/switch_3gang/driver.compose.json'));
    assert.ok(!(sw3.zigbee.manufacturerName || []).some((m) => /t7ugva7q/i.test(m)));
  });

  it('l9brjwau not on switch_2gang; TS0003 on wall_switch_3gang_1way', () => {
    const sw2 = JSON.parse(read('drivers/switch_2gang/driver.compose.json'));
    assert.ok(!(sw2.zigbee.manufacturerName || []).some((m) => /l9brjwau/i.test(m)));
    const wall = JSON.parse(read('drivers/wall_switch_3gang_1way/driver.compose.json'));
    assert.ok((wall.zigbee.manufacturerName || []).some((m) => /l9brjwau/i.test(m)));
  });

  it('7dcddnye on dimmer_wall only; pfbzs1an not on climate', () => {
    // WHY(P2238/P2671b): 7dcddnye sacred couple is dimmer_wall_1gang — not bulb_dimmable.
    // p2517 old wording said "not on dimmer" after a bad market-apply; Contre quoi is bleed onto bulb.
    const dim = JSON.parse(read('drivers/dimmer_wall_1gang/driver.compose.json'));
    assert.ok((dim.zigbee.manufacturerName || []).some((m) => /7dcddnye/i.test(m)));
    const bulb = JSON.parse(read('drivers/bulb_dimmable/driver.compose.json'));
    assert.ok(!(bulb.zigbee.manufacturerName || []).some((m) => /7dcddnye/i.test(m)));
    const climate = JSON.parse(read('drivers/climate_sensor/driver.compose.json'));
    assert.ok(!(climate.zigbee.manufacturerName || []).some((m) => /pfbzs1an/i.test(m)));
  });

  it('registry locks p2517 cases', () => {
    const reg = JSON.parse(read('data/user-misattribution-registry.json'));
    const ids = (reg.cases || []).map((c) => c.id);
    assert.ok(ids.includes('p2517-krwtzhfd-ts004f-not-leak'));
    assert.ok(ids.includes('p2517-t7ugva7q-ts0013-wall-3gang'));
    assert.ok(ids.includes('p2517-l9brjwau-ts0003-wall-3gang'));
  });
});
