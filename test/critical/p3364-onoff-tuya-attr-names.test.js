'use strict';

/**
 * P3364 - Bastien 1.0.229 diag (switch_4gang, exact couple _TZ3000_ltt60asa + TS0004):
 *   "[OnOff] Write backlightMode failed: backlightMode is not a valid attribute of onOff"
 *   "[OnOff] Write powerOnState failed: powerOnState is not a valid attribute of onOff"
 * The registered TuyaOnOffCluster declares 0x8001 as `indicatorMode` and 0x8002 as
 * `relayStatus`; the writer used other names, so the user's backlight / power-on
 * settings never reached the relay (Z2M writes genOnOff 0x8001 / 0x8002 for TS000x).
 * Contre quoi:
 * - the writer resolves the declared name by attribute id and writes it;
 * - an id that the cluster does not declare returns false (DP fallback) without throwing;
 * - a real device reject still returns false and is not reported as success.
 */

require('../../tools/ci/preload-homey-stub');
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const TuyaOnOffCluster = require('../../lib/clusters/TuyaOnOffCluster');

function fakeCluster(attrs, reject) {
  const writes = [];
  return {
    writes,
    constructor: { ATTRIBUTES: attrs },
    async writeAttributes(obj) {
      for (const k of Object.keys(obj)) {
        if (!attrs[k]) { throw new Error(`${k} is not a valid attribute of onOff`); }
      }
      if (reject) { const e = new Error('UNSUPPORTED_ATTRIBUTE'); e.zclStatus = 'UNSUPPORTED_ATTRIBUTE'; throw e; }
      writes.push(obj);
    },
  };
}

function fakeDevice(cluster) {
  const logs = [];
  const store = {};
  return {
    logs,
    log(m) { logs.push(String(m)); },
    error(m) { logs.push(String(m)); },
    getStoreValue(k) { return store[k]; },
    setStoreValue(k, v) { store[k] = v; return Promise.resolve(); },
    zclNode: { endpoints: { 1: { clusters: { onOff: cluster } } } },
  };
}

describe('P3364 Tuya onOff extension attributes are written by their declared name', function() {
  const write = UnifiedSwitchBase.prototype._writeOnOffAttribute;

  it('backlightMode (0x8001) is written as the declared indicatorMode', async function() {
    const c = fakeCluster(TuyaOnOffCluster.ATTRIBUTES);
    const ok = await write.call(fakeDevice(c), 'backlightMode', 1);
    assert.strictEqual(ok, true);
    assert.deepStrictEqual(c.writes, [{ indicatorMode: 1 }]);
  });

  it('powerOnState (0x8002) is written as the declared relayStatus', async function() {
    const c = fakeCluster(TuyaOnOffCluster.ATTRIBUTES);
    const ok = await write.call(fakeDevice(c), 'powerOnState', 2);
    assert.strictEqual(ok, true);
    assert.deepStrictEqual(c.writes, [{ relayStatus: 2 }]);
  });

  it('childLock keeps its own name', async function() {
    const c = fakeCluster(TuyaOnOffCluster.ATTRIBUTES);
    assert.strictEqual(await write.call(fakeDevice(c), 'childLock', 1), true);
    assert.deepStrictEqual(c.writes, [{ childLock: 1 }]);
  });

  it('an id the cluster does not declare returns false without a schema error', async function() {
    const c = fakeCluster({ onOff: { id: 0 } });
    const d = fakeDevice(c);
    assert.strictEqual(await write.call(d, 'backlightMode', 1), false);
    assert.strictEqual(c.writes.length, 0);
    assert.ok(!d.logs.some((l) => /is not a valid attribute/.test(l)));
  });

  it('a device reject is still a failure (caller falls back to the Tuya DP)', async function() {
    const c = fakeCluster(TuyaOnOffCluster.ATTRIBUTES, true);
    assert.strictEqual(await write.call(fakeDevice(c), 'powerOnState', 2), false);
  });
});
