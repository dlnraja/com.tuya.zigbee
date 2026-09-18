'use strict';

/**
 * P2580 — Transpose Z2M / ZHA / herdsman fixes into Homey (not into Z2M)
 *
 * Contre quoi:
 * - Z2M#13207 motor_direction string reports invert covers
 * - Z2M#12993 Tongou ac_frequency dual scale
 * - Z2M#32561 MTG detection_range signed VALUE
 * - Z2M#32851 dqy15zxy tubular motor misrouted to switch_2gang
 * - herdsman#13184 jt50ea5d heat meter DP7/DP8
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2580 Z2M/ZHA complementary transpose', () => {
  it('TuyaMotorDirection accepts string + enum (Z2M#13207)', () => {
    const { normalizeMotorDirection, toMotorDirectionEnum } = require('../../lib/tuya/TuyaMotorDirection');
    assert.strictEqual(normalizeMotorDirection('forward'), 'forward');
    assert.strictEqual(normalizeMotorDirection('back'), 'back');
    assert.strictEqual(normalizeMotorDirection('reversed'), 'back');
    assert.strictEqual(normalizeMotorDirection('normal'), 'forward');
    assert.strictEqual(normalizeMotorDirection(0), 'forward');
    assert.strictEqual(normalizeMotorDirection(1), 'back');
    assert.strictEqual(toMotorDirectionEnum('back'), 1);
    assert.strictEqual(toMotorDirectionEnum('forward'), 0);
  });

  it('TongouAcFrequency dual scale (Z2M#12993)', () => {
    const { normalizeTongouAcFrequency } = require('../../lib/tuya/TongouAcFrequency');
    assert.strictEqual(normalizeTongouAcFrequency(4999), 49.99);
    assert.strictEqual(normalizeTongouAcFrequency(50), 50);
    assert.strictEqual(normalizeTongouAcFrequency(49), 49);
    assert.ok(normalizeTongouAcFrequency(5002) > 50);
    assert.strictEqual(normalizeTongouAcFrequency(0.5), null);
  });

  it('TuyaUnsignedValue clamps scaled TX (Z2M#32561)', () => {
    const { toTuyaScaledUint, asUnsignedTuyaValue } = require('../../lib/tuya/TuyaUnsignedValue');
    assert.strictEqual(toTuyaScaledUint(2.2, 100, { max: 800 }), 220);
    assert.strictEqual(toTuyaScaledUint(8.5, 100, { max: 800 }), 800);
    assert.strictEqual(asUnsignedTuyaValue(-1), 0xffffffff);
    assert.strictEqual(asUnsignedTuyaValue(220), 220);
  });

  it('dqy15zxy+TS0601 is curtain_motor not switch_2gang (Z2M#32851)', () => {
    const sw = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/switch_2gang/driver.compose.json'), 'utf8'));
    const cu = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
    const swM = (sw.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    const cuM = (cu.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(!swM.some((m) => m.includes('dqy15zxy')));
    assert.ok(cuM.some((m) => m.includes('dqy15zxy')));
    assert.ok((cu.zigbee?.productId || []).includes('TS0601'));
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const hit = (reg.cases || []).find((c) => c.id === 'novadigital-dqy15zxy-curtain');
    assert.ok(hit);
    assert.strictEqual(hit.canonicalDriver, 'curtain_motor');
  });

  it('EKAZA TS0225 mfr unioned (Z2M#33103)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
    const mfrs = (compose.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.some((m) => m.includes('eep3fewj')));
    assert.ok((compose.zigbee?.productId || []).includes('TS0225'));
  });

  it('curtain + din_rail + radar + heat meter wire P2580 helpers', () => {
    const curtain = fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/device.js'), 'utf8');
    assert.ok(curtain.includes('TuyaMotorDirection'));
    const din = fs.readFileSync(path.join(ROOT, 'drivers/din_rail_meter/device.js'), 'utf8');
    assert.ok(din.includes('TongouAcFrequency') || din.includes('normalizeTongouAcFrequency'));
    const radar = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(radar.includes('toTuyaScaledUint'));
    assert.ok(radar.includes('asUnsignedTuyaValue'));
    const heat = fs.readFileSync(path.join(ROOT, 'drivers/ultrasonic_heat_meter/device.js'), 'utf8');
    assert.ok(heat.includes('jt50ea5d'));
    assert.ok(heat.includes('8:') && heat.includes('meter_power'));
  });
});
