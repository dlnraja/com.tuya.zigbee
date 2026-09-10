'use strict';

/**
 * P2453 — Gmail + GitHub integral couple locks
 * - ja5osu5g+TS004F → smart_knob (scene sibling of kaflzta4)
 * - an5rjiwd+TS0041 → button_wireless_1 (not 4-gang / not TS004F knob)
 * - 5tqxpine+TS0044 → scene_switch_4 (Z2M wall 4-btn)
 * - unreliable DP1 presence must not stick alarm_motion forever
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
const {
  classifyOperatingFamily,
} = require('../../lib/zigbee/DeviceOperatingMode');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');

function readCompose(id) {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, `../../drivers/${id}/driver.compose.json`), 'utf8')
  );
}

describe('P2453 — Gmail/GH couple + presence sticky fix', () => {
  it('ja5osu5g+TS004F locks smart_knob compose + FPDB', () => {
    const sk = readCompose('smart_knob');
    const b1 = readCompose('button_wireless_1');
    assert.ok(sk.zigbee.manufacturerName.some((m) => /ja5osu5g/i.test(m)));
    assert.ok(!b1.zigbee.manufacturerName.some((m) => /ja5osu5g/i.test(m)));
    assert.strictEqual(DeviceFingerprintDB.lookup('_TZ3000_ja5osu5g', 'TS004F').driver, 'smart_knob');
  });

  it('ja5osu5g is TS004F one-btn scene (writeSceneAttr)', () => {
    const fam = classifyOperatingFamily({
      driver: { id: 'smart_knob' },
      getSetting(k) {
        if (k === 'zb_manufacturer_name') return '_TZ3000_ja5osu5g';
        if (k === 'zb_model_id') return 'TS004F';
        return null;
      },
      getStoreValue() { return null; },
      getData() { return { manufacturerName: '_TZ3000_ja5osu5g', productId: 'TS004F' }; },
    });
    assert.strictEqual(fam.family, 'ts004f');
    assert.strictEqual(fam.defaultMode, 'scene');
    assert.strictEqual(fam.writeSceneAttr, true);
  });

  it('an5rjiwd+TS0041 locks button_wireless_1 (not smart_knob scene)', () => {
    const b1 = readCompose('button_wireless_1');
    const b4 = readCompose('button_wireless_4');
    assert.ok(b1.zigbee.manufacturerName.some((m) => /an5rjiwd/i.test(m)));
    assert.ok(!b4.zigbee.manufacturerName.some((m) => /an5rjiwd/i.test(m)));
    assert.strictEqual(DeviceFingerprintDB.lookup('_TZ3000_an5rjiwd', 'TS0041').driver, 'button_wireless_1');
    const fam = classifyOperatingFamily({
      driver: { id: 'button_wireless_1' },
      getSetting(k) {
        if (k === 'zb_manufacturer_name') return '_TZ3000_an5rjiwd';
        if (k === 'zb_model_id') return 'TS0041';
        return null;
      },
      getStoreValue() { return null; },
      getData() { return { manufacturerName: '_TZ3000_an5rjiwd', productId: 'TS0041' }; },
    });
    assert.notStrictEqual(fam.family, 'ts004f');
  });

  it('5tqxpine+TS0044 locks scene_switch_4', () => {
    const s4 = readCompose('scene_switch_4');
    const b4 = readCompose('button_wireless_4');
    assert.ok(s4.zigbee.manufacturerName.some((m) => /5tqxpine/i.test(m)));
    assert.ok(!b4.zigbee.manufacturerName.some((m) => /5tqxpine/i.test(m)));
    assert.strictEqual(DeviceFingerprintDB.lookup('_TZ3000_5tqxpine', 'TS0044').driver, 'scene_switch_4');
  });

  it('unreliable DP1 sticky true does not force presence without distance', () => {
    const inf = new IntelligentPresenceInference({ log() {} });
    assert.strictEqual(inf.updatePresenceDP(true, { unreliable: true }), false);
    assert.strictEqual(inf.state.inferredPresence, false);
    inf.updateDistance(1.2);
    assert.strictEqual(inf.updatePresenceDP(true, { unreliable: true }), true);
    assert.strictEqual(inf.updatePresenceDP(false, { unreliable: true }), false);
  });
});
