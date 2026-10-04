'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { ensureExportEnergy } = require('../lib/energy/ExportEnergyConfig');

function fakeDevice({ caps = ['meter_power', 'meter_power.exported'], manifest = {}, override = null } = {}) {
  const d = {
    calls: [],
    driver: { manifest: { energy: manifest } },
    hasCapability: (c) => caps.includes(c),
    getEnergy: () => override,
    setEnergy: async (e) => { d.calls.push(e); },
    log: () => {},
  };
  return d;
}

describe('#105 runtime export energy declaration', () => {
  it('declares meter_power.exported once when nothing declares it yet', async () => {
    const d = fakeDevice({ manifest: { approximation: { usageOff: 1 } } });
    assert.strictEqual(await ensureExportEnergy(d), true);
    assert.strictEqual(await ensureExportEnergy(d), false);
    assert.deepStrictEqual(d.calls, [{ approximation: { usageOff: 1 }, meterPowerImportedCapability: 'meter_power', meterPowerExportedCapability: 'meter_power.exported' }]);
  });
  it('leaves manifest, earlier overrides and cumulative meters alone', async () => {
    for (const opts of [
      { manifest: { meterPowerExportedCapability: 'meter_power.exported' } },
      { override: { cumulativeExportedCapability: 'meter_power.exported' } },
      { manifest: { cumulative: true } },
      { caps: ['meter_power'] },
    ]) {
      const d = fakeDevice(opts);
      assert.strictEqual(await ensureExportEnergy(d), false);
      assert.strictEqual(d.calls.length, 0);
    }
  });
});
