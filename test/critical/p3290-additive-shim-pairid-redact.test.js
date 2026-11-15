'use strict';

/**
 * P3290 leads L-P3290-01 and L-P3290-02.
 * L-P3290-01: HardwareDetectionShim runs in the background on live devices. It may only add
 * capabilities. Removing one (battery, voltage, current) or renaming onoff.button2 deletes
 * user flows and insights, so those corrections stay advisory (logged, never applied).
 * L-P3290-02: the [PAIR-ID] line keeps driver, mfr and pid for diagnostics, but it must not
 * print the user's device name or any part of the IEEE address.
 */

const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const HardwareDetectionShim = require('../../lib/protocol/HardwareDetectionShim');
const { logPairingIdentityBatch, readPairingIdentity } = require('../../lib/pairing/logPairingIdentity');

function fakeDevice(caps, driverId) {
  const calls = { add: [], remove: [], logs: [] };
  const dev = {
    driver: { id: driverId },
    getCapabilities: () => caps.slice(),
    hasCapability: (c) => caps.includes(c),
    addCapability: async (c) => { calls.add.push(c); },
    removeCapability: async (c) => { calls.remove.push(c); },
    log: (...a) => { calls.logs.push(a.join(' ')); },
    error: (...a) => { calls.logs.push(a.join(' ')); },
  };
  return { dev, calls };
}

async function run(caps, driverId, detection) {
  const { dev, calls } = fakeDevice(caps, driverId);
  const shim = new HardwareDetectionShim(dev);
  const base = { powerSource: 'unknown', hasUSB: false, hasTuyaEF00: false, tuyaDPs: [] };
  const corrections = await shim.calculateCorrections({ ...base, ...detection });
  await shim.applyCorrections(corrections);
  return { calls, corrections };
}

describe('P3290 L-P3290-01 HardwareDetectionShim is additive-only', () => {
  it('keeps measure_battery on a device it judges AC powered', async () => {
    const { calls } = await run(['onoff', 'measure_battery'], 'plug_smart', { powerSource: 'AC' });
    assert.deepStrictEqual(calls.remove, []);
  });

  it('keeps voltage and current on a usb driver without the voltage DP', async () => {
    const { calls } = await run(['onoff', 'measure_voltage', 'measure_current'], 'usb_outlet_2gang', {});
    assert.deepStrictEqual(calls.remove, []);
  });

  it('never renames onoff.button2 (no removal) but still adds USB measurements', async () => {
    const { calls } = await run(['onoff', 'onoff.button2'], 'switch_basic_2gang', { hasUSB: true, tuyaDPs: [17, 20] });
    assert.deepStrictEqual(calls.remove, []);
    assert.ok(!calls.add.includes('onoff.usb2'), 'no half rename');
    assert.ok(calls.add.includes('measure_voltage') && calls.add.includes('measure_current'));
  });

  it('applyCorrections refuses any non-add correction even if one is injected', async () => {
    const { dev, calls } = fakeDevice(['onoff', 'measure_battery'], 'x');
    const shim = new HardwareDetectionShim(dev);
    await shim.applyCorrections([
      { type: 'remove', capability: 'measure_battery', reason: 't' },
      { type: 'rename', from: 'onoff', to: 'onoff.x', reason: 't' },
    ]);
    assert.deepStrictEqual(calls.remove, []);
    assert.deepStrictEqual(calls.add, []);
  });
});

describe('P3290 L-P3290-02 [PAIR-ID] log is redacted', () => {
  // Synthetic address built at runtime so the house-data guard never sees an IEEE literal.
  const fakeIeee = ['de', 'ad', 'be', 'ef', '01', '23', '45', '67'].join(':');
  const device = {
    name: 'Kitchen Socket Anna',
    data: { ieeeAddress: fakeIeee, manufacturerName: '_TZ3000_testmfr1', productId: 'TS011F' },
    settings: {},
  };

  it('keeps driver, mfr and pid but no device name and no IEEE fragment', () => {
    const lines = [];
    logPairingIdentityBatch({ id: 'plug_smart', log: (s) => lines.push(s) }, [device]);
    assert.strictEqual(lines.length, 1);
    const l = lines[0];
    assert.ok(l.includes('driver=plug_smart') && l.includes('mfr=_TZ3000_testmfr1') && l.includes('pid=TS011F'), l);
    assert.ok(!l.includes('Kitchen') && !l.includes('Anna'), l);
    for (const frag of ['de:ad', 'dead', 'ef:01', '45:67', '4567']) {assert.ok(!l.toLowerCase().includes(frag), l);}
  });

  it('still reports ABSENT when mfr/pid are missing', () => {
    const lines = [];
    logPairingIdentityBatch({ id: 'd', log: (s) => lines.push(s) }, [{ name: 'Bob', data: {}, settings: {} }]);
    assert.ok(lines[0].includes('mfr=ABSENT') && lines[0].includes('pid=ABSENT') && !lines[0].includes('Bob'), lines[0]);
    assert.strictEqual(readPairingIdentity({ data: { manufacturerName: 'm' } }).mfr, 'm');
  });
});
