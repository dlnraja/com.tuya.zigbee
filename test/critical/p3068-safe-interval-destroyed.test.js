'use strict';
// P3068: safeSetInterval never arms an interval for a target already destroyed (deleted/uninit device).
const test = require('node:test');
const assert = require('node:assert');
const { safeSetInterval } = require('../../lib/utils/safe-timers');

function fakeHomey() {
  const armed = new Set();
  return {
    armed,
    setInterval(fn, ms) { const t = setInterval(fn, ms); t.unref(); armed.add(t); return t; },
    clearInterval(t) { armed.delete(t); clearInterval(t); },
  };
}

test('P3068 destroyed device: no interval is armed (direct and via .device owner)', () => {
  const homey = fakeHomey();
  const device = { homey, _destroyed: true };
  assert.strictEqual(safeSetInterval(device, () => {}, 1000), null);
  assert.strictEqual(homey.armed.size, 0);
});

test('P3068 live device and legacy call shapes still arm', () => {
  const homey = fakeHomey();
  const device = { homey, _destroyed: false };
  const t = safeSetInterval(device, () => {}, 1000);
  assert.ok(t);
  assert.strictEqual(homey.armed.size, 1);
  homey.clearInterval(t);
  const g = safeSetInterval(() => {}, 1000); // (fn, ms) shape
  assert.ok(g);
  clearInterval(g);
});
