'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const { lookup } = require('../../lib/pairing/UserMisattributionRegistry');

function composeMfrs(driver) {
  const fp = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  const json = JSON.parse(fs.readFileSync(fp, 'utf8'));
  return new Set((json.zigbee.manufacturerName || []).map((x) => String(x).toLowerCase()));
}

function hasMfr(driver, mfr) {
  return composeMfrs(driver).has(String(mfr).toLowerCase());
}

describe('stable sacred-couple routing (metering plugs / 4-gang / strip)', () => {
  it('routes TS011F okaz9tjs / fgwhjm9j onto the metering plug', () => {
    assert.strictEqual(hasMfr('plug_energy_monitor', '_TZ3000_okaz9tjs'), true);
    assert.strictEqual(hasMfr('button_wireless_plug', '_TZ3000_okaz9tjs'), false);
    assert.strictEqual(hasMfr('plug_energy_monitor', '_TZ3210_fgwhjm9j'), true);
    assert.strictEqual(hasMfr('climate_sensor', '_TZ3210_fgwhjm9j'), false);
    assert.strictEqual(lookup('_TZ3000_okaz9tjs', 'TS011F').canonicalDriver, 'plug_energy_monitor');
    assert.strictEqual(lookup('_TZ3210_fgwhjm9j', 'TS011F').canonicalDriver, 'plug_energy_monitor');
  });

  it('routes TS011F cfnprab5 onto the 4-outlet strip', () => {
    assert.strictEqual(hasMfr('socket_power_strip_four_three', '_TZ3000_cfnprab5'), true);
    assert.strictEqual(hasMfr('button_wireless_2', '_TZ3000_cfnprab5'), false);
    assert.strictEqual(lookup('_TZ3000_cfnprab5', 'TS011F').canonicalDriver, 'socket_power_strip_four_three');
  });

  it('routes ZCL 4-gang lwthnp7j onto switch_4gang', () => {
    assert.strictEqual(hasMfr('switch_4gang', '_TZ3000_lwthnp7j'), true);
    assert.strictEqual(lookup('_TZ3000_lwthnp7j', 'TS0004').canonicalDriver, 'switch_4gang');
  });
});
