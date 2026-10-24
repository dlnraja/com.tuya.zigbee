'use strict';
// P3021b task:next-02: guard the #1501 / #1502 / #1503 / TH01Z behaviour on this branch
// (master: 254cabc067, add37696ab, f558bf104d, e4077ec055). Ideas credited in CREDITS (Spec 006, JohanBendz develop-0.4).
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const read = (r) => fs.readFileSync(path.join(ROOT, r), 'utf8');

describe('P3021b next-02 ports', () => {
  it('#1501: a flood of identical unknown DPs logs and stores once, counts all', () => {
    const { logUnknownDP } = require('../../lib/utils/UnknownDPLogger');
    const logs = []; const store = [];
    const d = { log: (m) => logs.push(String(m)), getSetting: () => null, setStoreValue: (k) => { store.push(k); return Promise.resolve(); }, homey: { setTimeout: () => 1 } };
    for (let i = 0; i < 500; i++) { logUnknownDP(d, 42, 7); }
    logUnknownDP(d, 42, 8);
    const lines = logs.filter((l) => l.startsWith('[UNKNOWN-DP] DP42'));
    assert.strictEqual(lines.length, 2);
    assert.ok(lines[1].includes('+499 identical repeat'));
    assert.strictEqual(store.filter((k) => k.startsWith('_unknown_dp_')).length, 2);
    assert.strictEqual(d._unknownDPs[42].count, 501);
    assert.doesNotThrow(() => logUnknownDP({ log() {}, getSetting: () => null }, 1, 1));
  });

  it('#1502: colour temperature clamped to 0..1, vendor RGB-mode best-effort', () => {
    const src = read('lib/TuyaZigBeeLightDevice.js');
    const clamp01 = eval(src.match(/const clamp01 = ([^;]+);/)[1]);
    assert.strictEqual(clamp01(1 - 500 / 254), 0);
    assert.strictEqual(clamp01(1.3), 1);
    assert.strictEqual(clamp01(0.25), 0.25);
    assert.ok(Number.isNaN(clamp01(NaN)));
    assert.ok(/clamp01\(1 - \(value \/ MAX_COLORTEMPERATURE\)\)/.test(src));
    assert.ok(/clamp01\(1-\(colorTemperatureMireds \/ MAX_COLORTEMPERATURE\)\)/.test(src));
    assert.ok(/tuyaRgbMode\(\{ enable: 0 \}\)\s*\n\s*\.catch\(/.test(src));
  });

  it('#1503: plugs use the independent read-only on/off settings sync', async () => {
    const { syncTuyaOnOffSettings } = require('../../lib/helpers/TuyaOnOffSettingsSync');
    const applied = [];
    const d = { log() {}, setSettings: async (s) => { applied.push(s); }, zclNode: { endpoints: { 1: { clusters: { onOff: {
      readAttributes: async ([a]) => { if (a !== 'relayStatus') { throw new Error('UNSUPPORTED_ATTRIBUTE'); } return { relayStatus: 'Remember' }; },
    } } } } } };
    assert.deepStrictEqual(await syncTuyaOnOffSettings(d), { relay_status: '2' });
    for (const drv of ['smartplug', 'smartplug_2_socket', 'wall_socket', 'smartPlug_DinRail']) {
      assert.ok(read(`drivers/${drv}/device.js`).includes('TuyaOnOffSettingsSync'), drv);
    }
  });

  it('TH01Z: LCD sensor answers MCU time requests; sleepy sensors use the interview identity', () => {
    assert.ok(read('drivers/lcdtemphumidsensor_3/device.js').includes('setupListener(zclNode)'));
    const H = require('../../lib/helpers/ManufacturerNameHelper');
    assert.strictEqual(H.getManufacturerName({ node: { manufacturerName: '_TZE200_vvmbj46n' } }), '_TZE200_vvmbj46n');
  });
});
