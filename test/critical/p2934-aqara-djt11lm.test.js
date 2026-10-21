'use strict';
// P2934: Aqara DJT11LM (LUMI / lumi.vibration.aq1) on vibration_sensor + optional Lumi 0x0101 overlay.
const test = require('node:test');
const assert = require('node:assert');
const app = require('../../app.json');
const c = require('../../drivers/vibration_sensor/driver.compose.json');
const { decodeLumiVibrationFrame, attachLumiVibrationOverlay } = require('../../lib/overlays/LumiVibrationOverlay');

test('couple and closures cluster in compose and app.json', () => {
  for (const z of [c.zigbee, app.drivers.find((d) => d.id === 'vibration_sensor').zigbee]) {
    assert.ok(z.manufacturerName.includes('LUMI'));
    assert.ok(z.productId.includes('lumi.vibration.aq1'));
    assert.ok(z.endpoints['1'].clusters.includes(257));
    assert.ok(z.endpoints['1'].clusters.includes(0) && z.endpoints['1'].clusters.includes(6));
  }
});
test('no other driver claims LUMI x lumi.vibration.aq1', () => {
  const others = app.drivers.filter((d) => d.id !== 'vibration_sensor' && d.zigbee
    && (d.zigbee.manufacturerName || []).some((m) => m.toLowerCase() === 'lumi')
    && (d.zigbee.productId || []).some((p) => p.toLowerCase() === 'lumi.vibration.aq1'));
  assert.deepStrictEqual(others.map((d) => d.id), []);
});
test('decodes report attr 0x0055 events and angle', () => {
  // fc=0x18 tsn=1 cmd=0x0a, attr 0x0055 uint16 = 1
  assert.strictEqual(decodeLumiVibrationFrame(Buffer.from([0x18, 1, 0x0a, 0x55, 0x00, 0x21, 1, 0])).action, 'vibration');
  assert.strictEqual(decodeLumiVibrationFrame(Buffer.from([0x18, 1, 0x0a, 0x55, 0x00, 0x21, 2, 0])).action, 'tilt');
  const r = decodeLumiVibrationFrame(Buffer.from([0x1c, 0x5f, 0x11, 2, 0x0a, 0x55, 0x00, 0x21, 3, 0, 0x03, 0x05, 0x21, 45, 0]));
  assert.strictEqual(r.action, 'drop'); assert.strictEqual(r.angle, 45);
  assert.deepStrictEqual(decodeLumiVibrationFrame(Buffer.from([0x11, 1, 0x00])), {});
  assert.deepStrictEqual(decodeLumiVibrationFrame(null), {});
});
test('overlay arms only for LUMI and never throws', async () => {
  const mk = (mfr) => ({ getSetting: (k) => k === 'zb_manufacturer_name' ? mfr : null, log() {}, hasCapability: () => true,
    set: [], safeSetCapabilityValue(cap, v) { this.set.push([cap, v]); return Promise.resolve(); } });
  const node = { handleFrame: async () => 'root' };
  assert.strictEqual(attachLumiVibrationOverlay(mk('_TZE200_x'), node), false);
  const d = mk('LUMI');
  assert.strictEqual(attachLumiVibrationOverlay(d, node), true);
  const ret = await node.handleFrame(1, 0x0101, Buffer.from([0x18, 1, 0x0a, 0x55, 0x00, 0x21, 1, 0]), {});
  assert.strictEqual(ret, 'root');
  assert.deepStrictEqual(d.set[0], ['alarm_vibration', true]);
  require('../../lib/utils/safe-timers').safeClearTimeout(d, d._lumiVibTimer);
  assert.strictEqual(attachLumiVibrationOverlay(d, null), false);
});
