'use strict';
/**
 * P2662 — Contre quoi: blank zb_model_id must not skip HOBEIAN ZG-301Z heal
 * (Bastien live: Energy dashes / phantom power on Virtual+1gang when pid empty).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const heal = require(path.join(ROOT, 'lib/tuya/HobeianZg301zHeal.js'));

describe('P2662 HOBEIAN blank-pid heal + TS0043 anti-Virtual learnmode', () => {
  it('isHobeianZg301z true when HOBEIAN + switch_1gang + empty pid', () => {
    const device = {
      driver: { id: 'switch_1gang' },
      getSetting: (k) => (k === 'zb_manufacturer_name' ? 'HOBEIAN' : ''),
      getData: () => ({}),
      getStoreValue: () => null,
    };
    assert.equal(heal.isHobeianZg301z(device), true);
  });

  it('isHobeianZg301z still true for explicit ZG-301Z', () => {
    const device = {
      driver: { id: 'switch_1gang' },
      getSetting: (k) => (k === 'zb_manufacturer_name' ? 'HOBEIAN'
        : k === 'zb_model_id' ? 'ZG-301Z' : ''),
      getData: () => ({}),
    };
    assert.equal(heal.isHobeianZg301z(device), true);
  });

  it('isHobeianZg301z false for HOBEIAN soil pid', () => {
    const device = {
      driver: { id: 'soil_sensor' },
      getSetting: (k) => (k === 'zb_manufacturer_name' ? 'HOBEIAN'
        : k === 'zb_model_id' ? 'ZG-303Z' : ''),
      getData: () => ({}),
    };
    assert.equal(heal.isHobeianZg301z(device), false);
  });

  it('button_wireless_3 learnmode warns against Homey Virtual', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'),
      'utf8',
    ));
    const fr = c.zigbee.learnmode.instruction.fr || '';
    const en = c.zigbee.learnmode.instruction.en || '';
    assert.match(fr, /Homey Zigbee|Appareil Zigbee|générique|generique/i);
    assert.match(en, /Homey Zigbee|Virtual|Appareil Zigbee/i);
  });

  it('heal soft-fills zb_model_id when blank', async () => {
    const settings = { zb_manufacturer_name: 'HOBEIAN', zb_model_id: '' };
    const logs = [];
    const device = {
      driver: { id: 'switch_1gang' },
      getSetting: (k) => settings[k] || '',
      getData: () => ({}),
      getStoreValue: () => null,
      setSettings: async (u) => { Object.assign(settings, u); },
      setStoreValue: async () => {},
      hasCapability: () => false,
      removeCapability: async () => {},
      log: (m) => logs.push(m),
      _setGangOnOff: async () => {},
    };
    const ok = await heal.healHobeianZg301z(device, null);
    assert.equal(ok, true);
    assert.equal(settings.zb_model_id, 'ZG-301Z');
    assert.ok(logs.some((l) => /P2662|P2632/.test(l)));
  });
});
