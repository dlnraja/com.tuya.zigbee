'use strict';

/* global describe, it */

const assert = require('assert');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function loadWithHomeyMock(request, parent, isMain) {
  if (request === 'homey') {
    return {
      Device: class {},
      Driver: class {},
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { parseDPValue, stringifyDPValue } = require('../../lib/tuya-local/DPValueParser');
const TuyaLocalClient = require('../../lib/tuya-local/TuyaLocalClient');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const TuyaCloudAPI = require('../../lib/tuya-local/TuyaCloudAPI');
const TuyaSmartLifeAuth = require('../../lib/tuya-local/TuyaSmartLifeAuth');
const { ERROR_CATEGORY, classifyError } = require('../../lib/utils/ErrorClassifier');
const WiFiFanDevice = require('../../drivers/wifi_fan/device');
const WiFiGenericDevice = require('../../drivers/wifi_generic/device');

describe('SmartLife/Tuya WiFi regressions', () => {
  it('parses raw DP flow values including JSON payloads', () => {
    assert.strictEqual(parseDPValue('on', 'bool'), true);
    assert.strictEqual(parseDPValue('42.5', 'number'), 42.5);
    assert.deepStrictEqual(parseDPValue('{"scene":33}', 'json'), { scene: 33 });
    assert.strictEqual(stringifyDPValue({ scene: 33 }), '{"scene":33}');
  });

  it('classifies Tuya cloud 2001 as reachability/offline', () => {
    assert.strictEqual(classifyError(new Error('[2001] 2001')), ERROR_CATEGORY.REACHABILITY);
    assert.strictEqual(classifyError(new Error('Tuya error: 2001')), ERROR_CATEGORY.REACHABILITY);
  });

  it('builds sorted Tuya cloud query paths for signing and requests', () => {
    assert.strictEqual(
      TuyaCloudAPI._buildSignedPath('/v1.0/test', { z: 'last value', a: 'first value' }),
      '/v1.0/test?a=first+value&z=last+value'
    );
  });

  it('keeps QR polling independent from Homey timer APIs', async () => {
    const auth = new TuyaSmartLifeAuth({ log: () => {} });
    auth.qrCode = 'qr-token';
    auth.userCode = 'user-code';
    let calls = 0;
    auth._request = async () => {
      calls++;
      return { success: false, msg: 'pending' };
    };

    const result = await auth.pollQRLogin(35);

    assert.strictEqual(result.success, false);
    assert.match(result.error, /timeout/i);
    assert(calls >= 1);
  });

  it('keeps local TCP heartbeat independent from Homey timer APIs', async () => {
    let refreshes = 0;
    const client = new TuyaLocalClient({
      id: 'device-id',
      key: 'local-key',
      heartbeatInterval: 5,
      log: () => {},
    });
    client._connected = true;
    client._device = {
      refresh: () => { refreshes++; },
      disconnect: async () => {},
      removeAllListeners: () => {},
    };

    client._startHeartbeat();
    await new Promise(resolve => setTimeout(resolve, 20));
    await client.destroy();

    assert(refreshes >= 1);
  });

  it('settles command timeouts even after the local client is destroyed', async () => {
    const client = new TuyaLocalClient({ log: () => {}, commandTimeout: 5 });
    client._destroyed = true;

    await assert.rejects(
      client._withTimeout(new Promise(() => {}), 5, 'Command timeout'),
      /Device destroyed/
    );
  });

  it('calls the raw DP hook from TuyaLocalDevice data handling', async () => {
    const device = Object.create(TuyaLocalDevice.prototype);
    const dps = { 1: true, 25: '{"scene":33}' };
    let seen = null;

    Object.defineProperty(device, 'capabilityMap', { value: [] });
    device._destroyed = false;
    device._dpCache = null;
    device.log = () => {};
    device.error = () => {};
    device._processDPUpdate = async value => { seen = value; };

    await TuyaLocalDevice.prototype._onData.call(device, { dps });

    assert.deepStrictEqual(seen, dps);
  });

  it('tracks generic WiFi discovered DP keys without rewriting known subsets', () => {
    const device = Object.create(WiFiGenericDevice.prototype);
    device.getSetting = () => '{"1":true}';

    assert.deepStrictEqual(device._mergeDiscoveredDPs({ 1: false, 2: 'new' }), {
      changed: true,
      value: { 1: true, 2: 'new' },
    });

    device.getSetting = () => '{"1":true,"2":"old"}';
    assert.deepStrictEqual(device._mergeDiscoveredDPs({ 2: 'new' }), {
      changed: false,
      value: { 1: true, 2: 'old' },
    });
  });

  it('supports fan speed ranges such as Tuya 1-6 instead of only percentages', () => {
    const fan = Object.create(WiFiFanDevice.prototype);
    fan.getSetting = key => ({ fan_speed_min: 1, fan_speed_max: 6 }[key]);

    const speed = fan.dpMappings['3'];

    assert.strictEqual(speed.reverseTransform(0), 1);
    assert.strictEqual(speed.reverseTransform(1), 6);
    assert.strictEqual(speed.transform(1), 0);
    assert.strictEqual(speed.transform(6), 1);
    assert.strictEqual(speed.transform(undefined), 0);
    assert.strictEqual(speed.reverseTransform(undefined), 1);
  });
});
