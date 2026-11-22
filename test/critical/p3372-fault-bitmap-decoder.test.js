'use strict';

/**
 * P3372 - generic Tuya fault bitmap (cloud labels) -> alarm_* (lib/tuya/FaultBitmapAlarms).
 * Source: Homey forum 146735 #509 (https://community.homey.app/t/146735/509): Arete Two
 * dehumidifiers carry a "fault" Bitmap DP with labels tankfull, defrost, E1, E2, L2, L3, L4, wet;
 * the tank state was visible in the device info but nothing triggered. Contre quoi: the
 * declared wifi_dehumidifier_water_full card was never fired; no generic bitmap decoding.
 */

require('../../tools/ci/preload-homey-stub');
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const FBD = require('../../lib/tuya/FaultBitmapAlarms');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const WiFiDehumidifierDevice = require('../../drivers/wifi_dehumidifier/device');

const LABELS = ['tankfull', 'defrost', 'E1', 'E2', 'L2', 'L3', 'L4', 'wet'];

function dev(proto, st, caps) {
  const d = Object.create(proto);
  const values = {}; const triggered = []; const capSet = new Set(caps);
  Object.assign(d, {
    values, triggered, capSet,
    getStoreValue: (k) => st[k], setStoreValue: async (k, v) => { st[k] = v; },
    hasCapability: (c) => capSet.has(c), addCapability: async (c) => { capSet.add(c); },
    getCapabilityValue: (c) => c in values ? values[c] : null,
    safeSetCapabilityValue: async (c, v) => { values[c] = v; },
    triggerFlowCard: async (id) => { triggered.push(id); return true; },
    log() {}, error() {},
  });
  return d;
}

describe('P3372 FaultBitmapDecoder', () => {
  it('decodes bits to labels', () => {
    assert.deepStrictEqual(FBD.decode(0, LABELS), []);
    assert.deepStrictEqual(FBD.decode(1, LABELS), ['tankfull']);
    assert.deepStrictEqual(FBD.decode(0b100, LABELS), ['E1']);
    assert.deepStrictEqual(FBD.decode(0b11, LABELS), ['tankfull', 'defrost']);
    assert.deepStrictEqual(FBD.decode(1 << 9, LABELS), ['bit9']);
  });
  it('maps to alarm_water / alarm_problem; defrost alone is not a problem', () => {
    assert.deepStrictEqual(FBD.toAlarms(['tankfull']), { active: ['tankfull'], alarm_water: true, alarm_problem: false });
    assert.strictEqual(FBD.toAlarms(['defrost']).alarm_problem, false);
    assert.strictEqual(FBD.toAlarms(['E2']).alarm_problem, true);
  });
  it('finds the fault DP in a cloud table (forum #509 shape)', () => {
    const device = { status: [{ dp_id: 19, code: 'fault', type: 'Bitmap', values: JSON.stringify({ label: LABELS }) }] };
    assert.deepStrictEqual(FBD.findFaultDp(device), { dp: 19, labels: LABELS });
    assert.strictEqual(FBD.findFaultDp({ status: [{ dp_id: 1, code: 'switch', type: 'Boolean' }] }), null);
  });
});

describe('P3372 Wi-Fi layer applies the bitmap', () => {
  it('tank full sets alarm_water and fires the declared dehumidifier card once', async () => {
    const d = dev(WiFiDehumidifierDevice.prototype, { cloud_fault_dp: 19, cloud_fault_labels: LABELS }, ['alarm_water']);
    await d._applyFaultBitmap({ 19: 1 });
    await d._applyFaultBitmap({ 19: 1 });
    assert.strictEqual(d.values.alarm_water, true);
    assert.deepStrictEqual(d.triggered, ['wifi_dehumidifier_water_full']);
    await d._applyFaultBitmap({ 19: 0 });
    assert.strictEqual(d.values.alarm_water, false);
  });
  it('other faults add and set alarm_problem (additive)', async () => {
    const d = dev(TuyaLocalDevice.prototype, { cloud_fault_dp: 19, cloud_fault_labels: LABELS }, []);
    await d._applyFaultBitmap({ 19: 0b1000 });
    assert.ok(d.capSet.has('alarm_problem'));
    assert.strictEqual(d.values.alarm_problem, true);
    assert.strictEqual(d.values.alarm_water, undefined, 'alarm_water never invented');
  });
  it('no cloud fault DP -> untouched', async () => {
    const d = dev(TuyaLocalDevice.prototype, {}, ['alarm_water']);
    await d._applyFaultBitmap({ 19: 1 });
    assert.deepStrictEqual(d.values, {});
  });
  it('DP11 alarm_water rising edge from a plain mapping also fires the card', async () => {
    const d = dev(WiFiDehumidifierDevice.prototype, {}, ['alarm_water']);
    await d._setLocalCapabilityValue('alarm_water', true);
    assert.deepStrictEqual(d.triggered, ['wifi_dehumidifier_water_full']);
  });
});
