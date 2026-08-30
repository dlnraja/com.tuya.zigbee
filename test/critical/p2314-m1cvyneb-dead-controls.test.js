'use strict';

/**
 * P2314 — PresentSky `_TZE284_m1cvyneb`+TS0601: pair OK, controls dead
 * Gmail: Missing Zigbee Node's IEEE Address on writeBool DP1 (app 9.0.688)
 */

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

describe('P2314 PresentSky m1cvyneb dead controls', () => {
  it('detects Homey Missing IEEE errors', () => {
    assert.strictEqual(
      isMissingIeeeError(new Error("Missing Zigbee Node's IEEE Address (token: abc)")),
      true,
    );
    assert.strictEqual(isMissingIeeeError(new Error('TIMEOUT')), false);
  });

  it('accepts EUI-64 shapes only (not UUIDs)', () => {
    assert.strictEqual(_looksLikeIeee('a1b2c3d4e5f60708'), true);
    assert.strictEqual(_looksLikeIeee('0xA1B2C3D4E5F60708'), true);
    assert.strictEqual(_looksLikeIeee('A1:B2:C3:D4:E5:F6:07:08'), true);
    assert.strictEqual(_looksLikeIeee('f20dc4f0-1234-5678-9abc-def012345678'), false);
    assert.strictEqual(_looksLikeIeee('short'), false);
  });

  it('heals hollow zclNode from getData().ieeeAddress', async () => {
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
    assert.ok(node.ieeeAddr || node.ieeeAddress);
  });

  it('wall_dimmer uses heal + CapabilityCommandRouter + no queryAll on TX', () => {
    const src = read('drivers/wall_dimmer_tuya/device.js');
    assert.match(src, /healZigbeeNodeIdentity/);
    assert.match(src, /writeCapabilityWithFallbacks/);
    assert.match(src, /forceDp:\s*true/);
    assert.match(src, /light:\s*true/);
    assert.match(src, /_ensureEf00Manager/);
    assert.match(src, /toTuyaBrightness/);
    assert.doesNotMatch(src, /queryAll:\s*true[\s\S]{0,80}registerCapabilityListener/);
  });

  it('TuyaSpecificClusterDevice cascades L1–L5 and does not treat token as IEEE-ready', () => {
    const src = read('lib/TuyaSpecificClusterDevice.js');
    assert.match(src, /healZigbeeNodeIdentity/);
    assert.match(src, /P2314/);
    assert.match(src, /sendTuyaDP/);
    assert.match(src, /Token alone is NOT enough/);
    assert.match(src, /opts\.light === true/);
  });

  it('EF00 _sendDPRaw uses structured datapoint args + sendFrame fallback', () => {
    const src = read('lib/tuya/TuyaEF00Manager.js');
    assert.match(src, /status:\s*0/);
    assert.match(src, /transid/);
    assert.match(src, /sendFrame\(0xEF00/);
    assert.doesNotMatch(src, /datapoint\(\{\s*data:\s*frame\s*\}\)/);
  });

  it('brightness still MCU-safe 0–1000', () => {
    assert.strictEqual(toTuyaBrightness(0.5), 500);
    assert.strictEqual(toTuyaBrightness(1.5), 1000);
  });
});
