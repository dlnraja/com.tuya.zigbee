'use strict';
// P3065 D7: Wi-Fi (TuyaLocalDevice) capability changes fire the P2803-mapped declared driver
// triggers (wifi_door_lock "Locked"/"Unlocked"), never on the first value after start (P2702).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path = require('path');

const originalLoad = Module._load;
Module._load = function loadWithHomeyMock(request, parent, isMain) {
  if (request === 'homey') {return { Device: class {}, Driver: class {} };}
  return originalLoad.call(this, request, parent, isMain);
};
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
Module._load = originalLoad;

function fakeLock() {
  const flow = require(path.join(__dirname, '../../drivers/wifi_door_lock/driver.flow.compose.json'));
  const values = { locked: false };
  const fired = [];
  return {
    fired, values,
    driver: { id: 'wifi_door_lock' },
    homey: { manifest: { flow: { triggers: flow.triggers } }, app: {} },
    hasCapability: (c) => c in values,
    getCapabilityValue: (c) => values[c],
    async setCapabilityValue(c, v) { values[c] = v; },
    async triggerFlowCard(id, tokens) { fired.push(id); return true; },
    error() {}, log() {},
  };
}
const tick = () => new Promise((r) => setImmediate(r));

describe('P3065 D7 Wi-Fi mapped triggers', () => {
  it('locked/unlocked fire after the first (seeding) value', async () => {
    const d = fakeLock();
    const set = (v) => TuyaLocalDevice.prototype.safeSetCapabilityValue.call(d, 'locked', v);
    await set(true); await tick();
    assert.deepEqual(d.fired, [], 'first value after start only seeds');
    await set(false); await tick();
    await set(true); await tick();
    assert.deepEqual(d.fired, ['wifi_door_lock_wifi_lock_unlocked', 'wifi_door_lock_wifi_lock_locked']);
    await set(true); await tick();
    assert.equal(d.fired.length, 2, 'no fire without a change');
  });
});
