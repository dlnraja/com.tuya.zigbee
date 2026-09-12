'use strict';

/**
 * P2473 — EF00-only interview: never require OnOff(6); max raw/EF00 RX-TX fallback
 * Contre quoi: Joep/FrankEver/Moes Unknown pairing when compose lists cluster 6
 * while interview is [0,4,5,61184]; hollow ZCL OnOff TX with no EF00 cascade.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  TUYA_EF00_ONLY_CLUSTERS,
  isEf00OnlyInterviewShape,
  composeForbidsOnOffCluster,
  isKnownEf00OnlyManufacturer,
  forcePureTuyaDp,
  sendEf00DpMaxFallback,
} = require('../../lib/zigbee/Ef00OnlyInterview');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

describe('P2473 EF00-only interview + max RX/TX fallback', () => {
  it('SSOT clusters are [0,4,5,61184] without OnOff 6', () => {
    assert.deepStrictEqual([...TUYA_EF00_ONLY_CLUSTERS], [0, 4, 5, 61184]);
    assert.ok(isEf00OnlyInterviewShape([0, 4, 5, 61184]));
    assert.ok(isEf00OnlyInterviewShape([61184, 5, 4, 0]));
    assert.ok(!isEf00OnlyInterviewShape([0, 4, 5, 6, 61184]));
    assert.ok(composeForbidsOnOffCluster([0, 4, 5, 61184]));
    assert.ok(!composeForbidsOnOffCluster([0, 4, 5, 6, 61184]));
  });

  it('valve_dual_irrigation compose+app match Joep interview (no cluster 6)', () => {
    const compose = readJson('drivers/valve_dual_irrigation/driver.compose.json');
    const clusters = compose.zigbee.endpoints['1'].clusters;
    assert.deepStrictEqual(clusters, [0, 4, 5, 61184]);
    assert.ok(!clusters.includes(6));

    const app = readJson('app.json');
    const d = app.drivers.find((x) => x.id === 'valve_dual_irrigation');
    assert.deepStrictEqual(d.zigbee.endpoints['1'].clusters, [0, 4, 5, 61184]);
  });

  it('water_valve_smart compose+app never require OnOff 6 (FrankEver)', () => {
    const compose = readJson('drivers/water_valve_smart/driver.compose.json');
    const clusters = compose.zigbee.endpoints['1'].clusters;
    assert.ok(!clusters.includes(6), 'FrankEver/Tuya EF00 — compose must not list cluster 6');
    assert.ok(clusters.includes(61184), 'must keep EF00 61184');

    const app = readJson('app.json');
    const d = app.drivers.find((x) => x.id === 'water_valve_smart');
    assert.ok(d, 'water_valve_smart in app.json');
    assert.ok(!d.zigbee.endpoints['1'].clusters.includes(6), 'app.json must not list cluster 6');
  });

  it('valve_dual + water_valve force EF00 max fallback helpers', () => {
    const dual = fs.readFileSync(path.join(ROOT, 'drivers/valve_dual_irrigation/device.js'), 'utf8');
    assert.ok(dual.includes('sendEf00DpMaxFallback'), 'dual uses max fallback');
    assert.ok(dual.includes('forcePureTuyaDp'), 'dual forces pure DP');
    assert.ok(dual.includes('P2473'), 'P2473 marker');

    const valve = fs.readFileSync(path.join(ROOT, 'drivers/water_valve_smart/device.js'), 'utf8');
    assert.ok(valve.includes('sendEf00DpMaxFallback'), 'FrankEver uses max fallback');
    assert.ok(valve.includes('forcePureTuyaDp'), 'FrankEver forces pure DP');
    assert.ok(valve.includes('P2473'), 'P2473 marker');
  });

  it('forcePureTuyaDp marks known EF00-only mfrs', () => {
    assert.ok(isKnownEf00OnlyManufacturer('_TZE284_fhvpaltk'));
    assert.ok(isKnownEf00OnlyManufacturer('_TZE200_wt9agwf3'));
    const fake = {};
    assert.ok(forcePureTuyaDp(fake, { mfr: '_TZE284_fhvpaltk' }));
    assert.strictEqual(fake._isPureTuyaDP, true);
  });

  it('sendEf00DpMaxFallback tries manager then throws with attempts', async () => {
    const calls = [];
    const device = {
      tuyaEF00Manager: {
        async sendDP() { calls.push('sendDP'); return false; },
        async _sendDPRaw() { calls.push('raw'); return false; },
        async sendTuyaDP() { calls.push('sendTuyaDP'); return false; },
      },
    };
    await assert.rejects(
      () => sendEf00DpMaxFallback(device, 1, true, 'bool'),
      /ef00_dp_1_max_fallback_exhausted/,
    );
    assert.ok(calls.includes('sendDP') || calls.includes('raw'));
  });
});
