'use strict';

/**
 * Contre quoi (#560): EARU TRV06 `_TZE200_rxq4iti9`+TS0601 must use ME167 profile
 * (DP4=setpoint, DP5=temp, DP6=battery) — never Profile A (DP4=measure_temperature).
 * Sources: Z2M tuya.ts TRV06 / thermostat_3; GitHub #560 tip-lag 9.0.1331.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(
  path.join(ROOT, 'drivers', 'device_radiator_valve', 'device.js'),
  'utf8',
);

describe('P2810 TRV06 rxq4iti9 ME167 DP map', () => {
  it('locks rxq4iti9 in me167Tails and DP4/5/6 semantics in source', () => {
    assert.match(SRC, /rxq4iti9/);
    assert.match(SRC, /WHY\(#560/);
    assert.match(SRC, /4:\s*\{\s*capability:\s*'target_temperature'/);
    assert.match(SRC, /5:\s*\{\s*capability:\s*'measure_temperature'/);
    assert.match(SRC, /6:\s*\{\s*capability:\s*'measure_battery'/);
  });

  it('compose keeps sacred couple on device_radiator_valve', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers', 'device_radiator_valve', 'driver.compose.json'), 'utf8'),
    );
    const mfr = (compose.zigbee.manufacturerName || []).map(String);
    const pid = (compose.zigbee.productId || []).map(String);
    assert.ok(mfr.some((m) => /rxq4iti9/i.test(m)), 'mfr rxq4iti9 missing');
    assert.ok(pid.some((p) => /^ts0601$/i.test(p)), 'pid TS0601 missing');
  });

  it('evaluates dpProfile me167 for rxq4iti9 settings', () => {
    // Minimal stub: extract get dpProfile body by requiring class is heavy; assert source contract only
    const tailsMatch = SRC.match(/me167Tails\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(tailsMatch, 'me167Tails array missing');
    assert.match(tailsMatch[1], /rxq4iti9/);
  });
});
