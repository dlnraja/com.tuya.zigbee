'use strict';
// P3425: Nous E12 CO alarm _TZE284_sonkaxrd (Z2M nous.ts E12) lives on co_sensor, not climate_sensor, and DP1 enum 0
// means CO alarm (zhc trueFalseEnum0).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const lc = (id) => new Set(require(path.join(ROOT, 'drivers', id, 'driver.compose.json')).zigbee.manufacturerName.map((m) => m.toLowerCase()));
const app = require(path.join(ROOT, 'app.json'));
const appLc = (id) => new Set(app.drivers.find((d) => d.id === id).zigbee.manufacturerName.map((m) => m.toLowerCase()));

const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const C = require(require('path').resolve('drivers/co_sensor/device.js'));
const g = Object.getOwnPropertyDescriptor(C.prototype, 'dpMappings').get;
const nous = g.call({ _isSmokeOnly: () => false, _isNousE12: () => true });
const gen = g.call({ _isSmokeOnly: () => false, _isNousE12: () => false });
process.stdout.write(JSON.stringify({
  c1: nous[1].capability, t0: nous[1].transform(0), t1: nous[1].transform(1), c2: nous[2].capability,
  has9: 9 in nous, gen9: gen[9] && gen[9].capability,
}));
`;

describe('P3425 Nous E12 on co_sensor', function () {
  this.timeout(60000);
  it('both zhc spellings are on co_sensor (compose + app.json) and gone from climate_sensor', () => {
    for (const m of ['_tze284_sonkaxrd', '_tze2841000000_sonkaxrd']) {
      assert.ok(lc('co_sensor').has(m) && appLc('co_sensor').has(m), m);
    }
    assert.ok(!lc('climate_sensor').has('_tze284_sonkaxrd') && !appLc('climate_sensor').has('_tze284_sonkaxrd'));
    assert.ok(require(path.join(ROOT, 'drivers/co_sensor/driver.compose.json')).zigbee.productId.includes('TS0601'));
  });
  it('DP map: enum 0 = alarm, enum 1 = normal, DP2 ppm, no tamper on DP9; others keep the generic map', () => {
    const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
    assert.strictEqual(r.status, 0, r.stderr);
    const o = JSON.parse(r.stdout.trim().split('\n').pop());
    assert.deepStrictEqual(o, { c1: 'alarm_co', t0: true, t1: false, c2: 'measure_co', has9: false, gen9: 'alarm_tamper' });
  });
});
