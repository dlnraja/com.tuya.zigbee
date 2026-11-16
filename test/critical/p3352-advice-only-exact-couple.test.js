'use strict';

/**
 * P3352 leads L-P3350-01 and L-P3350-02.
 * L-P3350-01: FirmwareQuirkCompensator runs on every live device. A wrong mains guess (P3040b water
 * valves) or a DIY cap a user built flows on must never be deleted: removing a capability deletes
 * the user's flows and insights. The compensator is advice-only for capabilities: it logs, forbids
 * future runtime adds, and never calls removeCapability.
 * L-P3350-02: DeviceProfileRegistry matches the exact manufacturerName + productId couple only. A
 * mfr-only or pid-only hit returns the profile of another device (TS0601 is shared by hundreds of
 * products); only a generic default for the device type is allowed as a fallback.
 */

const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const { healFirmwareQuirks, DIY_CAPS } = require('../../lib/resilience/FirmwareQuirkCompensator');
const { DeviceProfileRegistry } = require('../../lib/registry/DeviceProfileRegistry');

function fakeDevice(caps, extra = {}) {
  const calls = { remove: [], logs: [] };
  const dev = {
    driver: { id: 'water_valve_smart' },
    hasCapability: (c) => caps.includes(c),
    getCapabilities: () => caps.slice(),
    removeCapability: async (c) => { calls.remove.push(c); },
    addCapability: async () => {},
    setEnergy: async () => {},
    setStoreValue: async () => {},
    log: (...a) => { calls.logs.push(a.join(' ')); },
    ...extra,
  };
  return { dev, calls };
}

describe('P3352 L-P3350-01 FirmwareQuirkCompensator is advice-only for capabilities', () => {
  it('never removes DIY caps from a normal driver, logs advice and forbids future adds', async () => {
    const { dev, calls } = fakeDevice(['onoff', ...DIY_CAPS]);
    await healFirmwareQuirks(dev);
    assert.deepStrictEqual(calls.remove, []);
    assert.ok(DIY_CAPS.every((c) => dev._forbiddenCapabilities.includes(c)));
    assert.ok(calls.logs.some((l) => l.includes('advisory') && l.includes('tuya_dp_value')));
  });

  it('never removes measure_battery / alarm_battery on a device flagged mains', async () => {
    const { dev, calls } = fakeDevice(['onoff', 'measure_battery', 'alarm_battery'], { mainsPowered: true });
    await healFirmwareQuirks(dev);
    assert.deepStrictEqual(calls.remove, []);
    assert.ok(calls.logs.some((l) => l.includes('advisory') && l.includes('measure_battery')));
  });

  it('the module source has no removeCapability call', () => {
    const src = require('fs').readFileSync(require.resolve('../../lib/resilience/FirmwareQuirkCompensator'), 'utf8');
    assert.ok(!/removeCapability\s*\(/.test(src));
  });
});

describe('P3352 L-P3350-02 DeviceProfileRegistry exact couple only', () => {
  const reg = new DeviceProfileRegistry();
  reg.register({ id: 'valve_a', manufacturerName: ['_TZE200_aaaaaaaa'], productId: ['TS0601'] });
  reg.register({ id: 'plug_b', manufacturerName: ['_TZ3000_bbbbbbbb'], productId: ['TS011F'] });
  reg.register({ id: 'generic_switch', isDefault: true, deviceType: 'switch' });

  it('matches the exact couple, case-insensitively', () => {
    assert.strictEqual(reg.getProfile('_tze200_AAAAAAAA', 'ts0601').id, 'valve_a');
    assert.strictEqual(reg.hasProfile('_TZE200_aaaaaaaa', 'TS0601'), true);
  });

  it('a known mfr with another pid gets no profile (no mfr-only fallback)', () => {
    assert.strictEqual(reg.getProfile('_TZE200_aaaaaaaa', 'TS0207'), null);
    assert.strictEqual(reg.hasProfile('_TZE200_aaaaaaaa', 'TS0207'), false);
  });

  it('another mfr with a known pid gets no profile (no pid-only fallback)', () => {
    assert.strictEqual(reg.getProfile('_TZE200_zzzzzzzz', 'TS0601'), null);
    assert.strictEqual(reg.hasProfile('_TZE200_zzzzzzzz', 'TS0601'), false);
  });

  it('the generic default of the device type is still the fallback', () => {
    assert.strictEqual(reg.getProfile('_TZE200_zzzzzzzz', 'TS0601', 'switch').id, 'generic_switch');
  });
});
