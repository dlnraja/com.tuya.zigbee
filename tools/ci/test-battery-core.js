// test-battery-core.js — P54 test suite for BatteryCore
'use strict';
const Core = require('../../lib/battery/BatteryCore');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log('  ✓', msg); }
  else { fail++; console.log('  ✗', msg); }
}

console.log('=== BatteryCore v2 tests ===\n');

console.log('1. Chemistry detection');
assert(Core.detectChemistry(3700) === 'Li-Ion', 'Li-Ion at 3.7V');
assert(Core.detectChemistry(3600) === 'LiFePO4', 'LiFePO4 at 3.6V');
assert(Core.detectChemistry(3000) === 'Coin Cell', 'Coin Cell at 3.0V');
assert(Core.detectChemistry(1500) === 'Alkaline', 'Alkaline at 1.5V');
assert(Core.detectChemistry(1200) === 'NiMH', 'NiMH at 1.2V (default NiMH)');
assert(Core.detectChemistry(1200, { rechargeable: true }) === 'NiMH', 'NiMH at 1.2V rechargeable');
assert(Core.detectChemistry(1300) === 'NiMH', 'NiMH at 1.3V (default NiMH)');
assert(Core.detectChemistry(12000) === 'Lead-Acid', 'Lead-Acid at 12V');

console.log('\n2. ZCL percent normalization');
assert(Core.normalizeZclPercent(100) === 100, 'ZCL 100% = 100%');
assert(Core.normalizeZclPercent(50) === 50, 'ZCL 50 = 50%');
assert(Core.normalizeZclPercent(200) === 50, 'ZCL 200 (full) = 50%');
assert(Core.normalizeZclPercent(0) === 0, 'ZCL 0 = 0%');
assert(Core.normalizeZclPercent(255) === null, 'ZCL 255 (unknown) = null');
assert(Core.normalizeZclPercent(null) === null, 'ZCL null = null');
assert(Core.normalizeZclPercent(150) === 25, 'ZCL 150 = 25%');

console.log('\n3. Voltage → percentage (curve)');
const liIon = Core.getCurveForChemistry('Li-Ion');
assert(Core.voltageToPercentCurve(4200, liIon) === 100, 'Li-Ion 4.2V = 100%');
assert(Core.voltageToPercentCurve(3000, liIon) === 0, 'Li-Ion 3.0V = 0%');
const p = Core.voltageToPercentCurve(3700, liIon);
assert(p >= 49 && p <= 51, 'Li-Ion 3.7V ~ 50% (got ' + p + ')');
const alkaline = Core.getCurveForChemistry('Alkaline');
assert(Core.voltageToPercentCurve(1500, alkaline) >= 85 && Core.voltageToPercentCurve(1500, alkaline) <= 95, 'Alkaline 1.5V ~ 90%');
assert(Core.voltageToPercentCurve(1000, alkaline) === 10, 'Alkaline 1.0V = 10%');

console.log('\n4. Linear interpolation (deprecated)');
assert(Core.voltageToPercentLinear(3300, 3000, 4200) === 25, 'Linear 3.3V between 3.0-4.2V = 25%');
assert(Core.voltageToPercentLinear(4500, 3000, 4200) === 100, 'Linear above max = 100%');
assert(Core.voltageToPercentLinear(2500, 3000, 4200) === 0, 'Linear below min = 0%');

console.log('\n5. Temperature compensation');
const comp = Core.voltageToPercentTempCompensated(3700, liIon, 10); // 10°C
assert(comp >= 49 && comp <= 51, 'Cold temp: still ~50% (got ' + comp + ')');
const comp20 = Core.voltageToPercentTempCompensated(3700, liIon, 20);
assert(comp20 >= 49 && comp20 <= 51, '20°C: still ~50%');

console.log('\n6. Moving average');
const hist = [{v: 4.0, t: 1}, {v: 4.1, t: 2}, {v: 3.9, t: 3}, {v: 4.0, t: 4}];
const avg = Core.movingAverage(hist, 4);
assert(avg >= 3.99 && avg <= 4.01, 'Avg of 4 readings ~ 4.0V (got ' + avg + ')');

console.log('\n7. Exponential smoothing');
const s1 = Core.exponentialSmoothing(80, null, 0.3);
assert(s1 === 80, 'First value passed through');
const s2 = Core.exponentialSmoothing(85, 80, 0.3);
assert(s2 > 80 && s2 < 85, 'EMA smooths toward new value (got ' + s2 + ')');

console.log('\n8. Kalman filter');
const k1 = Core.kalmanFilter(80, null, null);
assert(k1.estimate === 80, 'First Kalman estimate is measurement');
const k2 = Core.kalmanFilter(85, 80, 1.0);
assert(k2.estimate > 80 && k2.estimate < 85, 'Kalman smooths (got ' + k2.estimate + ')');
assert(k2.errorCovariance < 1.0, 'Error covariance decreases');

console.log('\n9. Cascade selection');
const c1 = Core.cascade([
  { name: 'zcl', value: null },
  { name: 'tuya', value: 80 },
  { name: 'stored', value: 75 },
]);
assert(c1.value === 80, 'Cascade picks first valid (tuya)');
assert(c1.source === 'tuya', 'Cascade reports source');

console.log('\n10. Hybrid selection');
const h1 = Core.hybridSelect({
  zcl: 80,
  tuya: 82,
  voltage: 3650,
  stored: 50,
}, { lastValue: 79, chemistry: 'Li-Ion' });
assert(h1 === 80, 'Hybrid picks zcl (highest confidence)');
const h2 = Core.hybridSelect({ tuya: 80, voltage: 3650 }, { chemistry: 'Li-Ion' });
assert(h2 === 80, 'Hybrid picks tuya when no zcl');

console.log('\n11. State of Health');
assert(Core.stateOfHealth(0, 'Li-Ion') === 100, 'New Li-Ion = 100% SOH');
assert(Core.stateOfHealth(500, 'Li-Ion') === 0, 'EOL Li-Ion = 0% SOH');
assert(Core.stateOfHealth(250, 'Li-Ion') === 50, 'Half-cycle Li-Ion = 50% SOH');
assert(Core.stateOfHealth(100, 'Coin Cell') === 100, 'Coin cell SOH always 100');

console.log('\n12. C-rate & time-to-empty');
assert(Core.cRate(1000, 2000) === 0.5, 'C-rate 0.5');
assert(Core.cRate(0, 2000) === null, 'C-rate null on 0 current');
const tte = Core.timeToEmpty(2000, 100, 50);
assert(tte === 10, 'Time to empty: 10h (got ' + tte + ')');

console.log('\n13. Anti-flood check');
assert(Core.antiFloodCheck(80, null) === true, 'No last value: accept');
assert(Core.antiFloodCheck(80, { value: 79, timestamp: Date.now() - 1000 }) === true, 'Small change: accept');
assert(Core.antiFloodCheck(80, { value: 10, timestamp: Date.now() - 1000 }) === false, 'Large change in window: reject');

console.log('\n14. Validation');
assert(Core.isValidBatteryValue(50) === true, '50% valid');
assert(Core.isValidBatteryValue(150) === false, '150% invalid');
assert(Core.isValidBatteryValue(-5) === false, '-5% invalid');
assert(Core.isValidBatteryValue(20, 80) === false, '20% from 80% = >50% drop (rejected)');
assert(Core.isValidBatteryValue(50, 80) === true, '50% from 80% = 30% drop (allowed)');
assert(Core.isValidBatteryValue(95, 10) === false, '95% from 10% = suspicious jump (rejected without confirmation)');
assert(Core.isValidBatteryValue(95, 10, { requireConfirmation: false }) === true, '95% jump allowed without confirmation');

console.log('\n15. Replacement detection');
const hist2 = [{value: 25, t: 1}, {value: 20, t: 2}, {value: 22, t: 3}];
assert(Core.detectReplacement(90, hist2) === true, 'Low→90% = replacement');
assert(Core.detectReplacement(25, hist2) === false, 'No replacement');
assert(Core.detectReplacement(80, [{value: 50, t: 1}]) === false, 'Not enough history');

console.log('\n=== Results: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail > 0 ? 1 : 0);
