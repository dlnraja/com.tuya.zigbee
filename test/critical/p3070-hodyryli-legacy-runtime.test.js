'use strict';
// P3070: _TZE284_hodyryli+TS0601 left climate_sensor's manifest for climate_sensor_zt08 (one couple,
// one driver). Homey keeps already paired devices on the driver they were paired with, so the
// climate_sensor runtime must still decode the ZT08 layout (Z2M tuya.ts ZT08 / GH #513):
// DP1 temp, DP2 humidity, DP3 battery_state 0/1/2 -> 10/50/100 %, DP38 probe temperature.
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
const CL = require('./drivers/climate_sensor/device.js');
const get = Object.getOwnPropertyDescriptor(CL.prototype, 'dpMappings').get;
const out = ['_TZE284_hodyryli', '_tze284_hodyryli', '_TZE284_HODYRYLI'].map((mfr) => {
  const m = get.call({ _manufacturerName: () => mfr });
  return [m[1].capability, m[2].capability, m[3].capability, m[3].transform ? [0, 1, 2].map(m[3].transform) : null,
    m[38] && m[38].capability];
});
console.log(JSON.stringify(out));
`;

describe('P3070 hodyryli devices already paired on climate_sensor keep working', () => {
  it('climate_sensor still decodes the ZT08 datapoints at runtime', () => {
    const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout.trim().split('\n').pop());
    for (const row of out) {
      assert.deepStrictEqual(row, ['measure_temperature', 'measure_humidity', 'measure_battery', [10, 50, 100],
        'measure_temperature.probe']);
    }
  });

  it('the climate_sensor driver folder stays shipped (paired devices are not orphaned)', () => {
    for (const f of ['driver.js', 'device.js', 'driver.compose.json']) {
      assert.ok(fs.existsSync(path.join(ROOT, 'drivers', 'climate_sensor', f)), f);
    }
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    assert.ok(app.drivers.some((d) => d.id === 'climate_sensor'));
  });
});
