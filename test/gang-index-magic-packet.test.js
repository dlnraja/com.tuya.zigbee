'use strict';

/**
 * Tests — GangIndexResolver + TuyaMagicPacket (P92.121)
 * 0-based vs 1-based button index normalisation and the mandatory Tuya
 * genBasic handshake (multi-gang per-gang control fix).
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { resolveGang, resolveDpGang } = require('../lib/utils/GangIndexResolver');
const { sendTuyaMagicPacket, MAGIC_ATTRIBUTES } = require('../lib/zigbee/TuyaMagicPacket');

function makeDevice() {
  const store = {};
  const logs = [];
  return {
    logs,
    log(msg) { logs.push(msg); },
    getStoreValue(k) { return store[k]; },
    setStoreValue(k, v) { store[k] = v; return Promise.resolve(); },
  };
}

describe('GangIndexResolver', () => {
  it('passes 1-based indices through by default', () => {
    const device = makeDevice();
    assert.strictEqual(resolveGang(device, 1, 'e000', 4), 1);
    assert.strictEqual(resolveGang(device, 4, 'e000', 4), 4);
  });

  it('learns 0-based numbering from an observed index 0 and shifts +1', () => {
    const device = makeDevice();
    assert.strictEqual(resolveGang(device, 0, 'e000', 4), 1, 'index 0 → gang 1');
    assert.strictEqual(resolveGang(device, 1, 'e000', 4), 2, 'now shifted');
    assert.strictEqual(resolveGang(device, 3, 'e000', 4), 4);
  });

  it('persists the learned base per source in the device store', () => {
    const device = makeDevice();
    resolveGang(device, 0, 'e000', 4);
    const stored = device.getStoreValue('gang_index_base');
    assert.strictEqual(stored.e000, 0);
    // a different source stays 1-based until it also shows a 0
    assert.strictEqual(resolveGang(device, 2, 'e001', 4), 2);
  });

  it('never returns a gang below 1 and clamps to maxGangs', () => {
    const device = makeDevice();
    assert.strictEqual(resolveGang(device, -3, 'scene', 4), 1);
    assert.strictEqual(resolveGang(device, 9, 'scene', 4), 4);
    assert.strictEqual(resolveGang(device, 9, 'scene', 0), 9, 'no clamp when gang count unknown');
  });

  it('resolveDpGang keeps DP ids 1-based by default', () => {
    const device = makeDevice();
    assert.strictEqual(resolveDpGang(device, 1, 6), 1);
    assert.strictEqual(resolveDpGang(device, 6, 6), 6);
  });

  it('survives devices without store access', () => {
    const bare = { log() {} };
    assert.strictEqual(resolveGang(bare, 0, 'e000', 4), 1);
    assert.strictEqual(resolveGang(bare, 2, 'e000', 4), 3);
  });
});

describe('TuyaMagicPacket', () => {
  function makeZcl(behavior) {
    return {
      endpoints: {
        1: {
          clusters: {
            genBasic: {
              readAttributes: async (attrs) => {
                behavior.calls.push(attrs);
                if (behavior.fail) { throw new Error(behavior.fail); }
                return { manufacturerName: '_TZ3000_test', modelIdentifier: 'TS0002' };
              },
            },
          },
        },
      },
    };
  }

  it('reads the exact Tuya attribute set on endpoint 1', async () => {
    const device = makeDevice();
    const behavior = { calls: [] };
    const ok = await sendTuyaMagicPacket(device, makeZcl(behavior), 1);
    assert.strictEqual(ok, true);
    assert.deepStrictEqual(behavior.calls[0], MAGIC_ATTRIBUTES);
    assert.deepStrictEqual(MAGIC_ATTRIBUTES, [0x0004, 0x0000, 0x0001, 0x0005, 0x0007, 0xfffe]);
  });

  it('is idempotent — sent once, then skipped (persisted)', async () => {
    const device = makeDevice();
    const behavior = { calls: [] };
    await sendTuyaMagicPacket(device, makeZcl(behavior), 1);
    await sendTuyaMagicPacket(device, makeZcl(behavior), 1);
    assert.strictEqual(behavior.calls.length, 1);
    // fresh module-level call with persisted flag: still skipped
    const device2 = makeDevice();
    device2.setStoreValue('tuya_magic_packet_sent', true);
    const ok = await sendTuyaMagicPacket(device2, makeZcl(behavior), 1);
    assert.strictEqual(ok, true);
    assert.strictEqual(behavior.calls.length, 1);
  });

  it('never throws on failure and does not mark as sent', async () => {
    const device = makeDevice();
    const behavior = { calls: [], fail: 'timeout' };
    const ok = await sendTuyaMagicPacket(device, makeZcl(behavior), 1);
    assert.strictEqual(ok, false);
    assert.strictEqual(device.getStoreValue('tuya_magic_packet_sent'), undefined);
  });

  it('returns false when no basic cluster exists', async () => {
    const device = makeDevice();
    const ok = await sendTuyaMagicPacket(device, { endpoints: { 1: { clusters: {} } } }, 1);
    assert.strictEqual(ok, false);
  });
});
