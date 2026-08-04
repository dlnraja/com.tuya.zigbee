'use strict';

/**
 * Tests — FallbackChains (P92.122)
 * Every unsupported op cascades to a working alternative; the working
 * path is remembered; transient errors never poison the chain.
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { execChain, readSensorWithFallbacks, findRawCluster } = require('../lib/zigbee/FallbackChains');

function makeDevice() {
  const store = {};
  const logs = [];
  return {
    logs,
    log(msg) { logs.push(msg); },
    getStoreValue(k) { return store[k]; },
    setStoreValue(k, v) { store[k] = v; return Promise.resolve(); },
    homey: { setTimeout: (fn) => { fn(); return 0; } },
  };
}

const UNSUPPORTED = () => Object.assign(new Error('UNSUPPORTED_ATTRIBUTE'), { status: 0x86 });

describe('execChain', () => {
  it('cascades past unsupported steps to the working one', async () => {
    const device = makeDevice();
    const out = await execChain(device, 'battery.read', [
      { name: 'zcl-percent', run: async () => { throw UNSUPPORTED(); } },
      { name: 'zcl-voltage', run: async () => 55 },
      { name: 'tuya-dp', run: async () => 99 },
    ]);
    assert.strictEqual(out.ok, true);
    assert.strictEqual(out.via, 'zcl-voltage');
    assert.strictEqual(out.result, 55);
  });

  it('remembers the working path and tries it first next time', async () => {
    const device = makeDevice();
    const order = [];
    const steps = () => [
      { name: 'zcl-percent', run: async () => { order.push('zcl-percent'); throw UNSUPPORTED(); } },
      { name: 'tuya-dp', run: async () => { order.push('tuya-dp'); return 80; } },
    ];
    await execChain(device, 'battery.read', steps());
    await execChain(device, 'battery.read', steps());
    assert.deepStrictEqual(order, ['zcl-percent', 'tuya-dp', 'tuya-dp'], 'second call skips the dead path');
    const paths = device.getStoreValue('zcl_working_paths');
    assert.strictEqual(paths['battery.read'], 'tuya-dp');
  });

  it('skips paths already known unsupported without calling them', async () => {
    const device = makeDevice();
    let called = false;
    await execChain(device, 'd', [
      { name: 'dead', run: async () => { throw UNSUPPORTED(); } },
      { name: 'alive', run: async () => 1 },
    ]);
    const out = await execChain(device, 'd', [
      { name: 'dead', run: async () => { called = true; throw UNSUPPORTED(); } },
      { name: 'alive', run: async () => 1 },
    ]);
    assert.strictEqual(out.ok, true);
    assert.strictEqual(called, false, 'dead path never re-executed');
  });

  it('stops on transient error without marking anything', async () => {
    const device = makeDevice();
    const out = await execChain(device, 'd2', [
      { name: 'a', run: async () => { throw new Error('timeout'); } },
      { name: 'b', run: async () => 1 },
    ]);
    assert.strictEqual(out.ok, false);
    assert.strictEqual(out.transient, true);
    assert.strictEqual(device.getStoreValue('zcl_working_paths'), undefined);
    // 'a' is not blacklisted: a retry calls it again
    let called = false;
    await execChain(device, 'd2', [{ name: 'a', run: async () => { called = true; return 2; } }]);
    assert.strictEqual(called, true);
  });
});

describe('readSensorWithFallbacks', () => {
  it('named cluster works → via zcl-named', async () => {
    const device = makeDevice();
    const cluster = { readAttributes: async () => ({ measuredValue: 2150 }) };
    const out = await readSensorWithFallbacks(device, cluster, 'msTemperatureMeasurement', 'measuredValue');
    assert.strictEqual(out.ok, true);
    assert.strictEqual(out.value, 2150);
    assert.strictEqual(out.via, 'zcl-named');
  });

  it('named dead → raw numeric cluster takes over', async () => {
    const device = makeDevice();
    device.zclNode = {
      endpoints: { 1: { clusters: { 0x0402: { readAttributes: async () => ({ measuredValue: 1980 }) } } } },
    };
    const deadNamed = {
      readAttributes: async () => { throw UNSUPPORTED(); },
    };
    const out = await readSensorWithFallbacks(device, deadNamed, 'msTemperatureMeasurement', 'measuredValue');
    assert.strictEqual(out.ok, true);
    assert.strictEqual(out.value, 1980);
    assert.strictEqual(out.via, 'zcl-raw-numeric');
  });

  it('both ZCL paths dead → Tuya DP fallback delivers', async () => {
    const device = makeDevice();
    device.zclNode = { endpoints: { 1: { clusters: {} } } };
    const deadNamed = { readAttributes: async () => { throw UNSUPPORTED(); } };
    const out = await readSensorWithFallbacks(device, deadNamed, 'msTemperatureMeasurement', 'measuredValue', {
      dpFallback: async () => 2210,
    });
    assert.strictEqual(out.ok, true);
    assert.strictEqual(out.value, 2210);
    assert.strictEqual(out.via, 'tuya-dp');
  });
});

describe('findRawCluster', () => {
  it('resolves numeric cluster ids from names', () => {
    const device = {
      zclNode: { endpoints: { 1: { clusters: { 1026: 'temp-cluster' } } } },
    };
    assert.strictEqual(findRawCluster(device, 'msTemperatureMeasurement'), 'temp-cluster');
    assert.strictEqual(findRawCluster(device, 'unknownCluster'), null);
  });
});
