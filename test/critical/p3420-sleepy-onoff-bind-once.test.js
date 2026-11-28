'use strict';

// P3420: a sleepy CR2032 remote (TS0043 profile: skipBatteryReporting + noEf00Tx)
// binds genOnOff once; later app restarts must not send the bind again.
// Mains devices keep binding on every init.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

class Base {
  constructor(profile, store) {
    this._profile = profile;
    this._store = store || {};
    this.gangCount = 3;
    this.buttonCount = 3;
    this.driver = { id: 'button_wireless_3' };
  }
  log() {}
  error() {}
  getStoreValue(k) { return this._store[k]; }
  async setStoreValue(k, v) { this._store[k] = v; }
  hasCapability(c) { return c === 'measure_battery'; }
  getEnergy() { return { batteries: ['CR2032'] }; }
  getSetting() { return null; }
  getCapabilityValue() { return null; }
  homey = { setTimeout, clearTimeout, setInterval, clearInterval };
}

function node(calls) {
  const onOff = { bind: async () => { calls.n += 1; }, on() {} };
  return { endpoints: { 1: { clusters: { onOff } } } };
}

// Like Button3GangDevice, the concrete class overrides the mixin profile.
class Dev extends PhysicalButtonMixin(Base) {
  getDeviceProfile() { return this._profile; }
}
const SLEEPY = { skipBatteryReporting: true, noEf00Tx: true };

async function setup(dev, zclNode) {
  try { await dev._setupGangPhysicalDetection(zclNode, 1); } catch (_e) { /* later wiring is out of scope */ }
}

describe('P3420 sleepy remote OnOff bind is one-shot', () => {
  it('first init binds and records onoff_bound_ep1', async () => {
    const calls = { n: 0 };
    const dev = new Dev(SLEEPY, {});
    await setup(dev, node(calls));
    assert.equal(calls.n, 1);
    assert.equal(dev._store.onoff_bound_ep1, true);
  });

  it('restart with onoff_bound_ep1 set sends no bind', async () => {
    const calls = { n: 0 };
    const dev = new Dev(SLEEPY, { onoff_bound_ep1: true });
    await setup(dev, node(calls));
    assert.equal(calls.n, 0);
  });

  it('failed bind is not recorded, so the next init retries', async () => {
    const dev = new Dev(SLEEPY, {});
    const zclNode = { endpoints: { 1: { clusters: { onOff: { bind: async () => { throw new Error('timeout'); }, on() {} } } } } };
    await setup(dev, zclNode);
    assert.notEqual(dev._store.onoff_bound_ep1, true);
  });

  it('non-sleepy profile still binds on every init', async () => {
    const calls = { n: 0 };
    const dev = new Dev({}, { onoff_bound_ep1: true });
    await setup(dev, node(calls));
    assert.equal(calls.n, 1);
  });
});
