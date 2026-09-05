'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  healZigbeeNodeIdentity,
  isMissingIeeeError,
  _looksLikeIeee,
} = require('../../lib/io/healZigbeeNodeIdentity');
const { toTuyaBrightness } = require('../../lib/tuya/TuyaBrightnessScale');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2314 PresentSky m1cvyneb dead controls (stable)', () => {
  it('detects Missing IEEE errors', () => {
    assert.strictEqual(
      isMissingIeeeError(new Error("Missing Zigbee Node's IEEE Address (token: abc)")),
      true,
    );
  });

  it('accepts EUI-64 only', () => {
    assert.strictEqual(_looksLikeIeee('a1b2c3d4e5f60708'), true);
    assert.strictEqual(_looksLikeIeee('f20dc4f0-1234-5678-9abc-def012345678'), false);
  });

  it('heals hollow zclNode', async () => {
    const node = { endpoints: { 1: { clusters: {} } } };
    const device = {
      zclNode: node,
      getData: () => ({ ieeeAddress: 'a1b2c3d4e5f60708', token: 'not-an-ieee-uuid-token' }),
      getSetting: () => null,
      getStoreValue: () => null,
      setStoreValue: async () => {},
      log: () => {},
    };
    const r = await healZigbeeNodeIdentity(device, { force: true });
    assert.strictEqual(r.ok, true);
  });

  it('wall_dimmer uses heal + CapabilityCommandRouter + no queryAll on TX', () => {
    const src = read('drivers/wall_dimmer_tuya/device.js');
    assert.match(src, /healZigbeeNodeIdentity/);
    assert.match(src, /CapabilityCommandRouter/);
    assert.doesNotMatch(src, /this\.queryAll\(\)/);
  });

  it('TuyaSpecificClusterDevice has P2314 cascade', () => {
    assert.match(read('lib/TuyaSpecificClusterDevice.js'), /P2314/);
  });

  it('brightness MCU-safe', () => {
    assert.strictEqual(toTuyaBrightness(0.5), 500);
  });
});
