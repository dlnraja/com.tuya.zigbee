'use strict';

/**
 * CapabilityCommandRouter — UNSUPPORTED_CLUSTER parallel cascade tests
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  writeCapabilityWithFallbacks,
  isUnsupportedError,
} = require('../../lib/zigbee/CapabilityCommandRouter');
const { isUnsupportedError: isUnsupReg } = require('../../lib/zigbee/UnsupportedRegistry');

function makeDevice(opts = {}) {
  const store = {};
  const logs = [];
  const dpSent = [];
  const zclCalls = [];
  const onOff = opts.onOffCluster === false ? null : {
    setOn: async () => {
      zclCalls.push('setOn');
      if (opts.zclFail) {
        throw Object.assign(new Error('UNSUPPORTED_CLUSTER'), { status: 0x81 });
      }
    },
    setOff: async () => {
      zclCalls.push('setOff');
      if (opts.zclFail) {
        throw Object.assign(new Error('UNSUPPORTED_CLUSTER'), { status: 0x81 });
      }
    },
  };
  const level = opts.levelCluster === false ? null : {
    moveToLevel: async (p) => {
      zclCalls.push(['moveToLevel', p]);
      if (opts.zclFail) {
        throw Object.assign(new Error('UNSUPPORTED_CLUSTER'), { status: 0x81 });
      }
    },
  };
  return {
    logs,
    zclCalls,
    dpSent,
    log(msg) { logs.push(msg); },
    getStoreValue(k) { return store[k]; },
    setStoreValue(k, v) { store[k] = v; return Promise.resolve(); },
    tuyaEF00Manager: {
      sendDP: async (dp, value, type) => {
        dpSent.push({ dp, value, type });
        if (opts.dpFail) {return false;}
        return true;
      },
    },
    zclNode: {
      endpoints: {
        1: {
          clusters: {
            ...(onOff ? { onOff, genOnOff: onOff } : {}),
            ...(level ? { levelControl: level, genLevelCtrl: level } : {}),
            ...(opts.rawOnOff ? { '6': opts.rawOnOff, 6: opts.rawOnOff } : {}),
          },
        },
      },
    },
  };
}

describe('CapabilityCommandRouter UNSUPPORTED_CLUSTER cascade', () => {
  it('detects Homey UNSUPPORTED_CLUSTER name/message', () => {
    assert.strictEqual(isUnsupportedError(new Error('UNSUPPORTED_CLUSTER')), true);
    assert.strictEqual(isUnsupReg({ name: 'UNSUPPORTED_CLUSTER', message: 'fail' }), true);
    assert.strictEqual(isUnsupportedError({ status: 0x81 }), true);
  });

  it('uses ZCL named path when cluster works', async () => {
    const device = makeDevice();
    const r = await writeCapabilityWithFallbacks(device, 'onoff', true);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.via, 'zcl-named');
    assert.ok(device.zclCalls.includes('setOn'));
    assert.strictEqual(device.dpSent.length, 0);
  });

  it('cascades to Tuya DP when ZCL throws UNSUPPORTED_CLUSTER', async () => {
    const device = makeDevice({ zclFail: true });
    const r = await writeCapabilityWithFallbacks(device, 'onoff', true);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.via, 'tuya-dp');
    assert.deepStrictEqual(device.dpSent[0], { dp: 1, value: true, type: 'bool' });
    assert.strictEqual(device.getStoreValue('zcl_working_paths')['cmd.onoff'], 'tuya-dp');
  });

  it('parallel discover prefers first success and remembers path', async () => {
    const device = makeDevice({ zclFail: true });
    const r1 = await writeCapabilityWithFallbacks(device, 'onoff', false, { parallelDiscover: true });
    assert.strictEqual(r1.ok, true);
    assert.ok(r1.via === 'tuya-dp' || r1.via === 'zcl-raw-numeric');
    const remembered = device.getStoreValue('zcl_working_paths')['cmd.onoff'];
    assert.ok(remembered);

    device.dpSent.length = 0;
    device.zclCalls.length = 0;
    const r2 = await writeCapabilityWithFallbacks(device, 'onoff', true, { parallelDiscover: true });
    assert.strictEqual(r2.ok, true);
    assert.strictEqual(r2.via, remembered);
  });

  it('dim cascades to DP 0-1000 when levelControl unsupported', async () => {
    const device = makeDevice({ zclFail: true });
    const r = await writeCapabilityWithFallbacks(device, 'dim', 0.5);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.via, 'tuya-dp');
    assert.strictEqual(device.dpSent[0].dp, 2);
    assert.strictEqual(device.dpSent[0].value, 500);
  });

  it('works with DP-only devices (no onOff cluster at all)', async () => {
    const device = makeDevice({ onOffCluster: false, levelCluster: false });
    const r = await writeCapabilityWithFallbacks(device, 'onoff', true, { parallelDiscover: true });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.via, 'tuya-dp');
  });

  it('EF00-only dimmer composes omit ZCL 6/8 (#2069)', () => {
    const fs = require('fs');
    for (const id of ['dimmer_2_gang_tuya', 'dimmer_1_gang_tuya', 'dimmer_3gang']) {
      const j = JSON.parse(fs.readFileSync(`drivers/${id}/driver.compose.json`, 'utf8'));
      const c = j.zigbee.endpoints['1'].clusters;
      assert.ok(c.includes(61184), `${id} must keep EF00`);
      assert.ok(!c.includes(6), `${id} must not declare onOff cluster 6`);
      assert.ok(!c.includes(8), `${id} must not declare levelControl cluster 8`);
    }
  });

  it('maps onoff.gang2 / onoff.2 to endpoint 2 and DP 2, never DP1', () => {
    const { _endpointFor, _dpIdFor } = require('../../lib/zigbee/CapabilityCommandRouter');
    assert.strictEqual(_endpointFor('onoff.gang2'), 2);
    assert.strictEqual(_endpointFor('onoff.2'), 2);
    assert.strictEqual(_endpointFor('onoff'), 1);
    assert.strictEqual(_dpIdFor('onoff.gang2'), 2);
    assert.strictEqual(_dpIdFor('onoff.2'), 2);
    assert.strictEqual(_dpIdFor('onoff.gang5'), 5);
    assert.strictEqual(_dpIdFor('onoff'), 1);
    assert.notStrictEqual(_dpIdFor('onoff.gang2'), 1);
  });

  it('parallel discover on gang 2 does not fire leftover EF00 DP1', async () => {
    const device = makeDevice();
    const ep2 = {
      setOn: async () => { device.zclCalls.push('ep2.setOn'); },
      setOff: async () => { device.zclCalls.push('ep2.setOff'); },
    };
    device.zclNode.endpoints[2] = { clusters: { onOff: ep2, genOnOff: ep2 } };

    const r = await writeCapabilityWithFallbacks(device, 'onoff.gang2', true, {
      endpoint: 2,
      parallelDiscover: true,
    });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.via, 'zcl-named');
    assert.ok(device.zclCalls.includes('ep2.setOn'));
    assert.strictEqual(device.dpSent.length, 0, 'must not race Tuya DP on gang 2');
  });

  it('skips Tuya DP entirely on zcl_only devices', async () => {
    const device = makeDevice();
    device._manufacturerConfig = { protocol: 'zcl_only' };
    device._isPureTuyaDP = false;
    const r = await writeCapabilityWithFallbacks(device, 'onoff', true, { parallelDiscover: true });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.via, 'zcl-named');
    assert.strictEqual(device.dpSent.length, 0);
  });

  it('skips leftover EF00 on multi-gang ZCL even when the cluster is present', async () => {
    const device = makeDevice();
    device.gangCount = 2;
    device._isPureTuyaDP = false;
    const ep2 = {
      setOn: async () => { device.zclCalls.push('ep2.setOn'); },
      setOff: async () => { device.zclCalls.push('ep2.setOff'); },
    };
    device.zclNode.endpoints[2] = { clusters: { onOff: ep2, genOnOff: ep2 } };
    const r = await writeCapabilityWithFallbacks(device, 'onoff.gang2', true, {
      endpoint: 2,
      dpId: 2,
    });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.via, 'zcl-named');
    assert.strictEqual(device.dpSent.length, 0);
  });
});
