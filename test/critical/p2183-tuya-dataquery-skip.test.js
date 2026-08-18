'use strict';

/**
 * Homey diag e181bc15: contact_sensor logged "DP query sent" after
 * requestDP skipped (sleepy / passive). TuyaDataQuery must not count
 * a false return as a sent query.
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { tuyaDataQuery } = require('../../lib/tuya/TuyaDataQuery');

function mockDevice(requestDPImpl) {
  const logs = [];
  return {
    logs,
    log: (...a) => logs.push(a.join(' ')),
    error: (...a) => logs.push(a.join(' ')),
    getName: () => 'contact_sensor',
    tuyaEF00Manager: {
      requestDP: requestDPImpl
    },
    zclNode: {
      endpoints: {
        1: { clusters: { tuya: {} } }
      }
    }
  };
}

describe('P2183 TuyaDataQuery skip is not sent', () => {
  it('does not log query sent when requestDP returns false', async () => {
    const device = mockDevice(async () => false);
    const ok = await tuyaDataQuery(device, [1, 2], { delayBetweenQueries: 0, silent: false });
    assert.strictEqual(ok, false);
    const joined = device.logs.join('\n');
    assert.ok(!/DP1 query sent/.test(joined), joined);
    assert.ok(/0\/2 queries sent/.test(joined), joined);
  });

  it('counts a true requestDP as sent', async () => {
    const device = mockDevice(async () => true);
    const ok = await tuyaDataQuery(device, [1], { delayBetweenQueries: 0, silent: false });
    assert.strictEqual(ok, true);
    assert.ok(device.logs.some((l) => /DP1 query sent/.test(l)));
  });
});
