'use strict';
// P3426: PJ-MGW1203 / PJ-1203-W clamp _TZE204/_TZE284/_TZE28C1000000_cjbofhxw (Z2M tuya.ts @ed29f80): DP18 A/1000,
// DP19 W/10, DP20 V/10, DP101 = energy of the last interval added to a running kWh total. Parallel RX: until
// DP18/19/20 is seen, DP101 stays on the legacy PJ-1203A decode.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');

const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const C = require(require('path').resolve('drivers/power_clamp_meter/device.js'));
const P = C.prototype;
function fake(mfr) {
  const store = {}; const caps = {};
  const ctx = { _cachedMfr: mfr, getSetting: () => '', getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; },
    hasCapability: () => true, getCapabilityValue: (c) => caps[c], safeSetCapabilityValue: async (c, v) => { caps[c] = v; } };
  for (const m of ['_p3426IsMgw1203Mfr', '_p3426MgwActive', '_p3426Set', '_p3426AddEnergy', '_p3426HandleMgw1203']) ctx[m] = P[m].bind(ctx);
  return { ctx, caps };
}
const a = fake('_TZE204_cjbofhxw');
const legacy101 = a.ctx._p3426HandleMgw1203(101, 50);
const b = fake('_TZE284_cjbofhxw');
const h = [b.ctx._p3426HandleMgw1203(18, 1234), b.ctx._p3426HandleMgw1203(19, 2305), b.ctx._p3426HandleMgw1203(20, 2301)];
b.ctx._p3426HandleMgw1203(101, 120); b.ctx._p3426HandleMgw1203(101, 80);
const other = fake('_TZE204_81yrt3lo').ctx._p3426HandleMgw1203(19, 2305);
process.stdout.write(JSON.stringify({ legacy101, h, caps: b.caps, other }));
`;

describe('P3426 PJ-MGW1203 clamp decode', function () {
  this.timeout(60000);
  it('legacy until DP18/19/20, then scaled values and accumulated kWh; other clamps untouched', () => {
    const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.strictEqual(r.status, 0, r.stderr);
    const o = JSON.parse(r.stdout.trim().split('\n').pop());
    assert.strictEqual(o.legacy101, false);
    assert.deepStrictEqual(o.h, [true, true, true]);
    assert.deepStrictEqual(o.caps, { measure_current: 1.234, measure_power: 230.5, measure_voltage: 230.1, meter_power: 0.2 });
    assert.strictEqual(o.other, false);
  });
  it('the zhc spelling _TZE28C1000000_cjbofhxw is on power_clamp_meter', () => {
    const c = require(path.join(ROOT, 'drivers/power_clamp_meter/driver.compose.json'));
    assert.ok(c.zigbee.manufacturerName.includes('_TZE28C1000000_cjbofhxw'));
  });
});
