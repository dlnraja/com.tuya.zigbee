// test-button-visual.js — P54 test suite for ButtonVisual
'use strict';
const BV = require('../../lib/device/ButtonVisual');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log('  ✓', msg); }
  else { fail++; console.log('  ✗', msg); }
}

console.log('=== ButtonVisual v2 tests ===\n');

console.log('1. Battery visual mapping');
assert(BV.getBatteryVisual(100).level === 'full', '100% = full');
assert(BV.getBatteryVisual(60).level === 'good', '60% = good');
assert(BV.getBatteryVisual(30).level === 'medium', '30% = medium');
assert(BV.getBatteryVisual(15).level === 'low', '15% = low');
assert(BV.getBatteryVisual(5).level === 'critical', '5% = critical');
assert(BV.getBatteryVisual(null).level === 'unknown', 'null = unknown');
assert(BV.getBatteryVisual(80).level === 'full', '80% = full (boundary)');
assert(BV.getBatteryVisual(50).level === 'good', '50% = good (boundary)');
assert(BV.getBatteryVisual(25).level === 'medium', '25% = medium (boundary)');
assert(BV.getBatteryVisual(10).level === 'low', '10% = low (boundary)');
assert(BV.getBatteryVisual(0).level === 'critical', '0% = critical');
assert(BV.getBatteryVisual(100).color === '#4CAF50', 'full = green');
assert(BV.getBatteryVisual(5).color === '#F44336', 'critical = red');

console.log('\n2. Signal strength visual');
assert(BV.getSignalVisual(-40).strength === 'excellent', '-40dBm = excellent');
assert(BV.getSignalVisual(-60).strength === 'good', '-60dBm = good');
assert(BV.getSignalVisual(-70).strength === 'fair', '-70dBm = fair');
assert(BV.getSignalVisual(-80).strength === 'weak', '-80dBm = weak');
assert(BV.getSignalVisual(-90).strength === 'poor', '-90dBm = poor');
assert(BV.getSignalVisual(null).strength === 'unknown', 'null = unknown');
assert(BV.getSignalVisual(-50).bars === 4, 'excellent = 4 bars');
assert(BV.getSignalVisual(-85).bars === 1, 'weak = 1 bar');
assert(BV.getSignalVisual(-100).bars === 0, 'poor = 0 bars');

console.log('\n3. Compute button state');
const idleDevice = {
  getCapabilityValue: (cap) => cap === 'measure_battery' ? 80 : null,
  getLastSeen: () => Date.now() - 1000, // 1s ago
  _lastPressTime: null,
};
const idleState = BV.computeButtonState(idleDevice);
assert(idleState.state === 'idle', 'Fresh device = idle');

const lowBattDevice = {
  getCapabilityValue: (cap) => cap === 'measure_battery' ? 15 : null,
  getLastSeen: () => Date.now() - 1000,
  _lastPressTime: null,
};
const lowState = BV.computeButtonState(lowBattDevice);
assert(lowState.state === 'low_battery', '15% = low_battery');

const critBattDevice = {
  getCapabilityValue: (cap) => cap === 'measure_battery' ? 5 : null,
  getLastSeen: () => Date.now() - 1000,
  _lastPressTime: null,
};
const critState = BV.computeButtonState(critBattDevice);
assert(critState.state === 'critical_battery', '5% = critical_battery');

const offlineDevice = {
  getCapabilityValue: () => 80,
  getLastSeen: () => Date.now() - 25 * 60 * 60 * 1000, // 25h ago
  _lastPressTime: null,
};
const offlineState = BV.computeButtonState(offlineDevice);
assert(offlineState.state === 'offline', '>24h no activity = offline');

const pressedDevice = {
  getCapabilityValue: () => 80,
  getLastSeen: () => Date.now() - 1000,
  _lastPressTime: Date.now() - 500, // pressed 0.5s ago
};
const pressedState = BV.computeButtonState(pressedDevice);
assert(pressedState.state === 'pressed', 'Recent press = pressed');

console.log('\n4. Format last seen');
const now = Date.now();
assert(BV.formatLastSeen(now - 5000) === '5s ago', '5s ago (en)');
assert(BV.formatLastSeen(now - 5 * 60 * 1000) === '5min ago', '5min ago (en)');
assert(BV.formatLastSeen(now - 3 * 60 * 60 * 1000) === '3h ago', '3h ago (en)');
assert(BV.formatLastSeen(now - 2 * 24 * 60 * 60 * 1000) === '2d ago', '2d ago (en)');
assert(BV.formatLastSeen(now - 5000, 'fr') === 'Il y a 5s', '5s ago (fr)');
assert(BV.formatLastSeen(now - 5 * 60 * 1000, 'fr') === 'Il y a 5min', '5min ago (fr)');
assert(BV.formatLastSeen(null) === 'Unknown', 'null = Unknown');
assert(BV.formatLastSeen(null, 'fr') === 'Inconnu', 'null = Inconnu');

console.log('\n5. Battery emoji');
assert(BV.batteryEmoji(100).includes('🔋'), '100% has battery emoji');
assert(BV.batteryEmoji(20).includes('🪫'), '20% has low battery emoji');
assert(BV.batteryEmoji(20).includes('20%'), '20% has percentage');
assert(BV.batteryEmoji(null) === '❓', 'null = question mark');

console.log('\n6. Signal emoji');
assert(BV.signalEmoji(-40).includes('📶'), '-40dBm has signal emoji');
assert(BV.signalEmoji(null) === '📡 ?', 'null = no signal');

console.log('\n7. Get visual summary');
const summary = BV.getVisualSummary({
  getCapabilityValue: (cap) => cap === 'measure_battery' ? 80 : null,
  getSetting: () => -60,
  getLastSeen: () => now - 1000,
});
assert(summary.battery.value === 80, 'Battery value 80');
assert(summary.battery.level === 'full', 'Battery level full');
assert(summary.signal.value === -60, 'Signal value -60');
assert(summary.signal.strength === 'good', 'Signal strength good');
assert(summary.state === 'idle', 'State idle');
assert(summary.lastSeenFormatted === '1s ago', 'Last seen 1s ago');

console.log('\n=== Results: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail > 0 ? 1 : 0);
