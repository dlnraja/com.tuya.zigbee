'use strict';

/**
 * P2510 — T26439 Kai_Dybvik irrigation (silent L99)
 * Contre quoi: water_valve_garden missing TS0101 / mq4wujmp so Homey pair misses
 * Woox/Moes valves already listed on smart_garden_irrigation_control.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2510 Kai T26439 irrigation couples', () => {
  it('water_valve_garden has TS0101 + mq4wujmp + cjfmu5he/kz1anoi8', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/water_valve_garden/driver.compose.json'), 'utf8'));
    const mfr = c.zigbee.manufacturerName.map((m) => String(m).toLowerCase());
    const pid = c.zigbee.productId.map((p) => String(p).toUpperCase());
    assert.ok(pid.includes('TS0101'), 'TS0101 for Woox-class irrigation');
    assert.ok(pid.includes('TS0049'), 'TS0049 Moes valve');
    assert.ok(mfr.some((m) => m.includes('mq4wujmp')));
    assert.ok(mfr.some((m) => m.includes('cjfmu5he')));
    assert.ok(mfr.some((m) => m.includes('kz1anoi8')));
  });

  it('smart_garden_irrigation_control keeps eymunffl+TS0101', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/smart_garden_irrigation_control/driver.compose.json'), 'utf8'));
    const mfr = c.zigbee.manufacturerName.map((m) => String(m).toLowerCase());
    const pid = c.zigbee.productId.map((p) => String(p).toUpperCase());
    assert.ok(mfr.some((m) => m.includes('eymunffl')));
    assert.ok(pid.includes('TS0101'));
    assert.ok(pid.includes('TS0049'));
  });
});
