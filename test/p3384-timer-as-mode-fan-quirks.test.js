'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const { isTimerLikeValue, shouldBindAsMode, filterModeMapping } = require('../lib/tuya-local/TimerAsModeGuard');
const {
  coerceSpeed,
  coerceDirection,
  planFanOff,
  planFanOn,
  shouldOverrideLightOn,
  markUserLight,
  LIGHT_OFF_PULSES_MS,
} = require('../lib/tuya-local/FanCourtesyQuirks');
const { isZhtS01Couple, DATA_POINTS, scaleTemp } = require('../lib/thermostats/ZhtS01Map');

describe('P3384 TimerAsModeGuard (forum 154077 #537-#538 diffuser)', () => {
  it('detects timer tokens such as 4h and refuses them as mode', () => {
    assert.strictEqual(isTimerLikeValue('4h'), true);
    assert.strictEqual(isTimerLikeValue('L1'), false);
    assert.strictEqual(shouldBindAsMode(['4h', '2h', '8h']), false);
    assert.strictEqual(filterModeMapping({ capability: 'thermostat_mode' }, ['4h']), null);
    assert.ok(filterModeMapping({ capability: 'onoff' }, ['4h']));
  });
});

describe('P3384 FanCourtesyQuirks (forum 154077 #539-#540 Mantra)', () => {
  it('plans courtesy light-off pulses when the user did not turn the light on', () => {
    const plan = planFanOff({ lightUserOn: false }, { keepLightOff: true, now: 0 });
    assert.deepStrictEqual(plan.actions.map((a) => a.atMs), LIGHT_OFF_PULSES_MS.slice());
    assert.strictEqual(shouldOverrideLightOn(plan.state, 10000), true);
  });

  it('leaves the light alone when the user turned it on, and ends override if they do so later', () => {
    const plan = planFanOff({ lightUserOn: true }, { keepLightOff: true, now: 0 });
    assert.deepStrictEqual(plan.actions, []);
    const marked = markUserLight(plan.state, true);
    assert.strictEqual(shouldOverrideLightOn(marked, 1000), false);
  });

  it('sends remembered direction together with power on', () => {
    const plan = planFanOn({ pendingDirection: true }, { rememberDirection: true, fanDp: 1, directionDp: 101 });
    assert.deepStrictEqual(plan.dps, { 1: true, 101: true });
    assert.strictEqual(coerceSpeed('32', { asText: true }), '32');
    assert.strictEqual(coerceDirection('reverse'), true);
  });
});

describe('P3384 ZHT-S01 couple map (Z2M moes.ts)', () => {
  it('recognises only the official couple and scales DP 111/117 by 10', () => {
    assert.strictEqual(isZhtS01Couple('_TZE284_rlytpmij', 'TS0601'), true);
    assert.strictEqual(isZhtS01Couple('_tze284_rlytpmij', 'TS0601'), true);
    assert.strictEqual(isZhtS01Couple('_TZE204_e5m9c5hl', 'TS0601'), false);
    assert.strictEqual(DATA_POINTS.targetTemperature, 111);
    assert.strictEqual(DATA_POINTS.currentTemperature, 117);
    assert.strictEqual(scaleTemp(163), 16.3);
  });
});
