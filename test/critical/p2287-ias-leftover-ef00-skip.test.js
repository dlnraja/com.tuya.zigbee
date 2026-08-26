'use strict';

/**
 * P2287 — IAS leftover EF00 TX skip (BOTH / ias_sleepy critical gap)
 * WHY: Boot HYBRID-QUERY / queryAllDPs on sleepy IAS bricks mesh (Peter SOS, water leak).
 */

const assert = require('assert');
const { describe, it } = require('node:test');
const { shouldSkipIasOnlyEf00Tx } = require('../../lib/io/shouldSkipIasOnlyEf00Tx');

function device(partial) {
  return Object.assign(
    {
      getSetting: () => null,
      getData: () => ({}),
      zclNode: { endpoints: {} },
    },
    partial
  );
}

describe('P2287 shouldSkipIasOnlyEf00Tx', () => {
  it('skips when _iasOnlyProfile / _skipTuyaDataQuery', () => {
    assert.strictEqual(shouldSkipIasOnlyEf00Tx(device({ _iasOnlyProfile: true })), true);
    assert.strictEqual(shouldSkipIasOnlyEf00Tx(device({ _skipTuyaDataQuery: true })), true);
  });

  it('skips sleepy IAS pids (TS0207 / TS0203 / TS0041)', () => {
    assert.strictEqual(
      shouldSkipIasOnlyEf00Tx(device({ getSetting: (k) => (k === 'zb_model_id' ? 'TS0207' : null) })),
      true
    );
    assert.strictEqual(
      shouldSkipIasOnlyEf00Tx(device({ getData: () => ({ modelId: 'TS0203' }) })),
      true
    );
    assert.strictEqual(
      shouldSkipIasOnlyEf00Tx(device({ getData: () => ({ productId: 'TS0041' }) })),
      true
    );
  });

  it('skips IAS present without EF00 cluster', () => {
    const d = device({
      zclNode: {
        endpoints: {
          1: { clusters: { iasZone: {}, basic: {} } },
        },
      },
    });
    assert.strictEqual(shouldSkipIasOnlyEf00Tx(d), true);
  });

  it('does NOT skip when EF00/Tuya cluster present (MCU)', () => {
    const d = device({
      zclNode: {
        endpoints: {
          1: { clusters: { iasZone: {}, tuya: {} } },
        },
      },
    });
    assert.strictEqual(shouldSkipIasOnlyEf00Tx(d), false);
  });

  it('honors profile.noEf00Tx (P2285 remotes)', () => {
    const d = device({
      getDeviceProfile: () => ({ noEf00Tx: true }),
    });
    assert.strictEqual(shouldSkipIasOnlyEf00Tx(d), true);
  });
});
