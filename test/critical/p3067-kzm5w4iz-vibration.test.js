'use strict';
// P3067 family 7: _TZE200_kzm5w4iz is a TS0601 vibration/contact sensor (Z2M tuya.ts TS0601_vibration_sensor,
// ZHA quirk: DP1 contact, DP3 battery, DP10 vibration). It sat in button_emergency_sos (which forbids alarm_contact);
// it now has one owner, vibration_sensor, with its own DP map.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const V = require(require('path').resolve('drivers/vibration_sensor/device.js'));
const map = (mfr) => {
  const self = Object.create(V.prototype);
  Object.assign(self, { getSetting: (k) => (k === 'zb_manufacturer_name' ? mfr : (k === 'zb_model_id' ? 'TS0601' : undefined)), getData: () => ({ manufacturerName: mfr, productId: 'TS0601' }), log: () => {} });
  const d = Object.getOwnPropertyDescriptor(V.prototype, 'dpMappings').get.call(self);
  const o = {}; for (const [k, v] of Object.entries(d)) o[k] = v.capability; return o;
};
console.log(JSON.stringify({ k: map('_TZE200_kzm5w4iz'), g: map('_TZE200_other123') }));
`;

describe('P3067 kzm5w4iz vibration/contact sensor owner and DP map', () => {
  const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  const out = JSON.parse((r.stdout || '').trim().split('\n').pop() || '{}');
  it('maps DP1 contact, DP3 battery, DP10 vibration', () => {
    assert.strictEqual(r.status, 0, r.stderr);
    assert.deepStrictEqual(out.k, { 1: 'alarm_contact', 3: 'measure_battery', 10: 'alarm_vibration' });
  });
  it('leaves the generic vibration map unchanged', () => { assert.strictEqual(out.g[1], 'alarm_vibration'); });
  it('has exactly one owner driver (vibration_sensor) in app.json', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const owners = app.drivers.filter((d) => (d.zigbee?.manufacturerName || []).some((m) => /^_tze200_kzm5w4iz$/i.test(m))).map((d) => d.id);
    assert.deepStrictEqual(owners, ['vibration_sensor']);
  });
});
