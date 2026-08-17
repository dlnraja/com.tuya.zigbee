'use strict';

/**
 * P217 — harvest from JohanBendz PRs / sister forks
 * Sacred couples only (manufacturerName + productId).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { getDriverId } = require('../../lib/tuya/DeviceFingerprintDB');
const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
const { lookup, isForbiddenPlacement } = require('../../lib/pairing/UserMisattributionRegistry');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function hasMfr(compose, mfr) {
  return (compose.zigbee.manufacturerName || [])
    .some((x) => String(x).toLowerCase() === String(mfr).toLowerCase());
}

describe('P217 fork harvest sacred couples', () => {
  it('routes LoraTap garage away from wireless plug', () => {
    const garage = readJson('drivers/garage_door/driver.compose.json');
    const plug = readJson('drivers/button_wireless_plug/driver.compose.json');
    assert(hasMfr(garage, '_TZE200_wfxuhoea'));
    assert(!hasMfr(plug, '_TZE200_wfxuhoea'));
    assert.strictEqual(getDriverId('_TZE200_wfxuhoea', 'TS0601'), 'garage_door');
    assert(isForbiddenPlacement('_TZE200_wfxuhoea', 'button_wireless_plug'));
  });

  it('routes k6fvknrr TS011F to double power point, not 1-gang', () => {
    const dpp2 = readJson('drivers/double_power_point_2/driver.compose.json');
    const sw1 = readJson('drivers/switch_1gang/driver.compose.json');
    assert(hasMfr(dpp2, '_TZ3000_k6fvknrr'));
    assert(!hasMfr(sw1, '_TZ3000_k6fvknrr'));
    assert.strictEqual(getDriverId('_TZ3000_k6fvknrr', 'TS011F'), 'double_power_point_2');
  });

  it('pairs Wing TS0203 as contact, not water leak', () => {
    const contact = readJson('drivers/contact_sensor/driver.compose.json');
    assert(hasMfr(contact, 'Wing'));
    assert.strictEqual(getDriverId('Wing', 'TS0203'), 'contact_sensor');
    const def = DeviceFingerprintDB.lookup('no-such-mfr', 'TS0203');
    assert.strictEqual(def.driver, 'contact_sensor');
    const c = lookup('Wing', 'TS0203');
    assert.strictEqual(c.canonicalDriver, 'contact_sensor');
  });

  it('locks HOBEIAN ZG-305Z on 2-gang switch', () => {
    const sw2 = readJson('drivers/switch_2gang/driver.compose.json');
    const btn2 = readJson('drivers/button_wireless_2/driver.compose.json');
    assert(hasMfr(sw2, 'HOBEIAN'));
    assert((sw2.zigbee.productId || []).includes('ZG-305Z'));
    assert(!(btn2.zigbee.productId || []).includes('ZG-305Z'));
    assert.strictEqual(getDriverId('HOBEIAN', 'ZG-305Z'), 'switch_2gang');
  });

  it('sends Dooya position as DP1 command, not DP2', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedCoverBase.js'), 'utf8');
    assert(src.includes('_isDooyaDp1CommandMotor'));
    assert(src.includes('3ylew7b4'));
    assert(src.includes('skip DP2 position write'));
  });

  it('does not let conflict resolve strip HOBEIAN from switch_2gang', () => {
    const { isPidDisambiguatedBrand, resolveConflict } = require('../../scripts/automation/fix-fingerprint-conflicts');
    assert.strictEqual(isPidDisambiguatedBrand('HOBEIAN'), true);
    assert.strictEqual(isPidDisambiguatedBrand('Wing'), true);
    const removals = resolveConflict(
      { mfr: 'hobeian', pid: 'TS0601', drivers: ['switch_2gang', 'soil_sensor', 'water_leak_sensor'] },
      new Map()
    );
    assert.deepStrictEqual(removals, []);
  });
});
