'use strict';

/**
 * Tests — UnsupportedRegistry (P92.120)
 * Negative cache for unsupported ZCL ops: precise detection, no false
 * positives on transient Ember/timeout errors, per-attribute isolation,
 * persistence in the device store, silent skipping afterwards.
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  getRegistry,
  isUnsupportedError,
  readAttributesSmart,
  configureReportingSmart,
} = require('../lib/zigbee/UnsupportedRegistry');

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

describe('isUnsupportedError', () => {
  it('detects ZCL textual statuses', () => {
    assert.strictEqual(isUnsupportedError(new Error('UNSUPPORTED_ATTRIBUTE')), true);
    assert.strictEqual(isUnsupportedError(new Error('unsupported_cluster_command')), true);
    assert.strictEqual(isUnsupportedError(new Error('Status: NOT_SUPPORTED')), true);
  });

  it('detects numeric ZCL status codes', () => {
    assert.strictEqual(isUnsupportedError({ status: 0x86 }), true);
    assert.strictEqual(isUnsupportedError({ status: 0x81 }), true);
    assert.strictEqual(isUnsupportedError({ status: 0xc3 }), true);
  });

  it('does NOT flag transient errors (never poison the cache)', () => {
    assert.strictEqual(isUnsupportedError(new Error('timeout')), false);
    assert.strictEqual(isUnsupportedError(new Error('Could not reach device')), false);
    assert.strictEqual(isUnsupportedError(new Error('MAC_NO_ACK')), false);
    assert.strictEqual(isUnsupportedError(null), false);
    assert.strictEqual(isUnsupportedError(new Error('0x86 buffer full')), false);
  });
});

describe('UnsupportedRegistry', () => {
  it('marks once, logs once, then skips silently', () => {
    const device = makeDevice();
    const registry = getRegistry(device);
    registry.mark('genPowerCfg', 'batteryPercentageRemaining', 'tuya-dp');
    registry.mark('genPowerCfg', 'batteryPercentageRemaining', 'tuya-dp');
    assert.strictEqual(registry.isKnown('genPowerCfg', 'batteryPercentageRemaining'), true);
    assert.strictEqual(registry.isKnown('genPowerCfg', 'batteryVoltage'), false);
    const markLogs = device.logs.filter((l) => l.includes('genPowerCfg.batteryPercentageRemaining'));
    assert.strictEqual(markLogs.length, 1, 'only the first mark logs');
  });

  it('persists the matrix in the device store', () => {
    const device = makeDevice();
    getRegistry(device).mark('genPowerCfg', 'batteryVoltage');
    const stored = device.getStoreValue('zcl_unsupported_matrix');
    assert.ok(stored && stored['genPowerCfg.batteryVoltage'], 'matrix persisted');
  });

  it('filterAttrs removes known-unsupported attributes', () => {
    const device = makeDevice();
    const registry = getRegistry(device);
    registry.mark('genPowerCfg', 'batteryPercentageRemaining');
    assert.deepStrictEqual(
      registry.filterAttrs('genPowerCfg', ['batteryPercentageRemaining', 'batteryVoltage']),
      ['batteryVoltage']
    );
  });
});

describe('readAttributesSmart', () => {
  it('returns batch data when supported', async () => {
    const device = makeDevice();
    const cluster = { readAttributes: async () => ({ measuredValue: 2150 }) };
    const out = await readAttributesSmart(device, cluster, 'msTemperatureMeasurement', ['measuredValue']);
    assert.strictEqual(out.measuredValue, 2150);
  });

  it('isolates per attribute on unsupported batch failure and marks only the bad one', async () => {
    const device = makeDevice();
    const calls = [];
    const cluster = {
      readAttributes: async (attrs) => {
        calls.push(attrs);
        if (attrs.length > 1) { throw new Error('UNSUPPORTED_ATTRIBUTE'); }
        if (attrs[0] === 'bad') { throw new Error('UNSUPPORTED_ATTRIBUTE'); }
        return { [attrs[0]]: 42 };
      },
    };
    const out = await readAttributesSmart(device, cluster, 'testCluster', ['good', 'bad']);
    assert.strictEqual(out.good, 42);
    assert.strictEqual(out.bad, undefined);
    assert.strictEqual(getRegistry(device).isKnown('testCluster', 'bad'), true);
    assert.strictEqual(getRegistry(device).isKnown('testCluster', 'good'), false);
  });

  it('does NOT mark on transient failure and retries next time', async () => {
    const device = makeDevice();
    let calls = 0;
    const cluster = {
      readAttributes: async () => {
        calls++;
        if (calls === 1) { throw new Error('timeout'); }
        return { measuredValue: 100 };
      },
    };
    await readAttributesSmart(device, cluster, 'c', ['measuredValue']);
    assert.strictEqual(getRegistry(device).isKnown('c', 'measuredValue'), false);
    const out = await readAttributesSmart(device, cluster, 'c', ['measuredValue']);
    assert.strictEqual(out.measuredValue, 100);
  });

  it('skips known-unsupported attrs and invokes the fallback instead', async () => {
    const device = makeDevice();
    getRegistry(device).mark('genPowerCfg', 'batteryPercentageRemaining', 'tuya-dp');
    let readCalled = false;
    const fallbackAttrs = [];
    const cluster = {
      readAttributes: async () => { readCalled = true; return {}; },
    };
    await readAttributesSmart(device, cluster, 'genPowerCfg', ['batteryPercentageRemaining'], {
      onFallback: async (_d, missing) => { fallbackAttrs.push(...missing); },
    });
    assert.strictEqual(readCalled, false, 'no Zigbee traffic for known-unsupported attr');
    assert.deepStrictEqual(fallbackAttrs, ['batteryPercentageRemaining']);
  });
});

describe('configureReportingSmart', () => {
  it('blacklists unreportable attrs once, then skips without failing', async () => {
    const device = makeDevice();
    let calls = 0;
    const cluster = {
      configureReporting: async () => { calls++; throw new Error('UNSUPPORTED_ATTRIBUTE'); },
    };
    const ok1 = await configureReportingSmart(device, cluster, 'genPowerCfg', { batteryVoltage: {} });
    assert.strictEqual(ok1, false);
    assert.strictEqual(getRegistry(device).isKnown('genPowerCfg', 'batteryVoltage'), true);
    const ok2 = await configureReportingSmart(device, cluster, 'genPowerCfg', { batteryVoltage: {} });
    assert.strictEqual(ok2, false);
    assert.strictEqual(calls, 1, 'second attempt skipped, no traffic');
  });
});
