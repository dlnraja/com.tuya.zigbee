'use strict';

const assert = require('assert');
const RawFrameDeduplicator = require('../../lib/zigbee/RawFrameDeduplicator');
const TuyaEF00Manager = require('../../lib/tuya/TuyaEF00Manager');
const IntelligentFrameAnalyzer = require('../../lib/zigbee/IntelligentFrameAnalyzer');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function createDevice() {
  return {
    destroyed: false,
    _destroyed: false,
    driver: { id: 'button_wireless_4' },
    homey: {
      app: {},
      setTimeout: () => ({ unref() {} }),
      clearTimeout: () => {},
    },
    dpMappings: {
      30: { capability: 'custom_zero' },
      31: { capability: 'custom_false' },
      32: { capability: 'custom_repeat' },
    },
    log: () => {},
    error: () => {},
    getData: () => ({ id: 'test-device' }),
    getSetting: () => null,
    getSettings: () => ({}),
    setStoreValue: () => Promise.resolve(),
    hasCapability: () => false,
    addCapability: () => Promise.resolve(),
    safeSetCapabilityValue: () => Promise.resolve(),
  };
}

describe('raw advertisement and state-map handling', () => {
  it('deduplicates only exact raw payloads, not same-prefix state maps', () => {
    const dedup = new RawFrameDeduplicator({ defaultWindowMs: 1000, tuyaWindowMs: 1000 });
    const first = { Payload: Buffer.from('00000102000400000001', 'hex'), CommandID: 0x02 };
    const samePrefixDifferentDP = { Payload: Buffer.from('00000102000400000002', 'hex'), CommandID: 0x02 };

    assert.strictEqual(dedup.shouldSuppress(1, 0xEF00, first).suppress, false);
    assert.strictEqual(dedup.shouldSuppress(1, 0xEF00, first).suppress, true);
    assert.strictEqual(dedup.shouldSuppress(1, 0xEF00, samePrefixDifferentDP).suppress, false);
  });

  it('preserves 0 and false DP values while suppressing unchanged repeats', async () => {
    const manager = new TuyaEF00Manager(createDevice());
    const reports = [];
    manager.on('dpReport', report => reports.push(report));

    await manager.handleDatapoint({ dp: 30, value: 0, dpType: 'value' });
    await manager.handleDatapoint({ dp: 31, value: false, dpType: 'bool' });
    await manager.handleDatapoint({ dp: 32, value: 7, dpType: 'enum' });
    await manager.handleDatapoint({ dp: 32, value: 7, dpType: 'enum' });
    await manager.handleDatapoint({ dp: 32, value: 8, dpType: 'enum' });

    assert.deepStrictEqual(
      reports.map(report => [report.dpId, report.value]),
      [[30, 0], [31, false], [32, 7], [32, 8]]
    );
  });

  it('extracts changed values from full EF00 state maps with ZCL/Tuya headers', () => {
    const analyzer = new IntelligentFrameAnalyzer(createDevice());
    const payload = Buffer.from([
      0x09, 0x42, 0x01, 0x00, 0x00,
      0x01, 0x01, 0x00, 0x01, 0x00,
      0x02, 0x02, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00,
    ]);

    const decoded = analyzer.parse(1, 0xEF00, { Payload: payload, CommandID: 0x02 });

    assert.deepStrictEqual(
      decoded.datapoints.map(dp => [dp.dpId, dp.value]),
      [[1, false], [2, 0]]
    );
  });
});
