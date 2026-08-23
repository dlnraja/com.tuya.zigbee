'use strict';

/**
 * L99 — EnergyJumpGuard sticky factor syncs into SmartDivisor LEARNED cache
 */
const assert = require('assert');
const EnergyJumpGuard = require('../../lib/tuya/EnergyJumpGuard');
const {
  clearDivisorCache,
  getLearnedDivisor,
  rememberLearnedDivisor,
} = require('../../lib/managers/SmartDivisorManager');

function mockDevice() {
  const logs = [];
  return {
    logs,
    log: (...a) => logs.push(a.join(' ')),
    _energyParseMeta: { mfr: '_TZ3000_test', dpId: 20, divisor: 100, capability: 'meter_power' },
  };
}

clearDivisorCache();
EnergyJumpGuard.reset();

const d = mockDevice();
// Seed history low
let v = EnergyJumpGuard.check(d, 10);
assert.strictEqual(v, 10);

// Impossible jump: 10 → 50000 with base divisor 100 → sticky ×0.01 or ×0.1 should fire
v = EnergyJumpGuard.check(d, 50000);
assert.ok(v < 5000, `expected corrected kWh, got ${v}`);

const learned = getLearnedDivisor('_TZ3000_test', 20, 'meter_power');
assert.ok(learned != null && learned > 100, `expected learned divisor > 100, got ${learned}`);

// Direct remember API
assert.strictEqual(rememberLearnedDivisor('_X', 1, 'meter_power', 1000), true);
assert.strictEqual(getLearnedDivisor('_X', 1, 'meter_power'), 1000);
assert.strictEqual(rememberLearnedDivisor('_X', 1, 'meter_power', 0), false);

clearDivisorCache();
EnergyJumpGuard.reset(d);

console.log('l99-energy-jump-divisor: OK');
