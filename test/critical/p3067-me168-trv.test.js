'use strict';
// P3067 family 5 (TRV): AVATTO / Girier ME168 (_TZE200_cxakecfo/_ybsqljjg/_4aijvczq/_r5ksy7qo, Z2M avatto.ts
// ME168_AVATTO, Domoticz z4d TS0601-ME168). Three of them sat in climate_sensor (DP1 temperature, DP2 humidity)
// and cxakecfo rode TRV Profile A (DP3 = setpoint, DP4 = temperature). The ME167 core applies (DP4/5 /10),
// and DP15 is the window state, never a battery %.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const compose = (d) => require(path.join(ROOT, 'drivers', d, 'driver.compose.json')).zigbee;
const TAILS = ['cxakecfo', 'ybsqljjg', '4aijvczq', 'r5ksy7qo'];

describe('P3067 ME168 AVATTO TRV', () => {
  it('device_radiator_valve owns the 4 couples (both casings), climate_sensor none', () => {
    const trv = compose('device_radiator_valve');
    assert.ok(trv.productId.includes('TS0601'));
    for (const t of TAILS) {
      assert.ok(trv.manufacturerName.includes(`_TZE200_${t}`), t);
      assert.ok(trv.manufacturerName.includes(`_tze200_${t}`), t);
      assert.ok(!compose('climate_sensor').manufacturerName.some((m) => m.toLowerCase() === `_tze200_${t}`), t);
    }
  });

  const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const T = require(require('path').resolve('drivers/device_radiator_valve/device.js'));
const d = (C, n) => Object.getOwnPropertyDescriptor(C.prototype, n).get;
const run = (mfr) => {
  const self = { _resolveMfr: () => mfr };
  self.dpProfile = d(T, 'dpProfile').call(self);
  Object.defineProperty(self, 'dpProfile', { value: self.dpProfile });
  const m = d(T, 'dpMappings').call(self);
  const g = (k) => m[k] || {};
  return [self.dpProfile, g(4).capability, g(4).divisor || null, g(5).capability || null, g(5).divisor || null, g(6).capability || null,
    g(15).capability || g(15).type, g(15).transform ? g(15).transform(0) : null, g(101).type || g(101).capability];
};
console.log(JSON.stringify({ me168: ['_TZE200_cxakecfo', '_TZE200_YBSQLJJG', '_tze200_4aijvczq', '_TZE200_r5ksy7qo'].map(run),
  me167: run('_TZE200_rxq4iti9'), std: run('_TZE200_abcdefgh') }));
`;
  const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  const out = JSON.parse((r.stdout || '').trim().split('\n').pop() || '{}');

  it('ME168 rides the ME167 core and reads DP15 as window state', () => {
    assert.strictEqual(r.status, 0, r.stderr);
    for (const row of out.me168) {
      assert.deepStrictEqual(row, ['me167', 'target_temperature', 10, 'measure_temperature', 10, 'measure_battery', 'window_open', true, 'comfort_temp']);
    }
  });

  it('other TRVs keep their maps (ME167 DP15 battery, Profile A unchanged)', () => {
    assert.deepStrictEqual(out.me167.slice(0, 7), ['me167', 'target_temperature', 10, 'measure_temperature', 10, 'measure_battery', 'measure_battery']);
    assert.strictEqual(out.me167[8], 'eco_mode');
    assert.strictEqual(out.std[0], 'standard');
    assert.strictEqual(out.std[1], 'measure_temperature');
  });

  it('fingerprint hints and mfs_db name device_radiator_valve / TS0601', () => {
    const fp = require(path.join(ROOT, 'lib/tuya/fingerprints.json'));
    const mfs = require(path.join(ROOT, 'data/mfs_db.json')).devices;
    for (const t of TAILS) {
      const k = `_TZE200_${t.toUpperCase()}`;
      const shard = require(path.join(ROOT, `lib/tuya/fp-shards/TZE200_${t[0]}.json`));
      for (const db of [fp, shard]) {
        assert.strictEqual(db[k].driverId, 'device_radiator_valve', k);
        assert.deepStrictEqual(db[k].modelIds, ['TS0601']);
      }
      assert.strictEqual(mfs[`_tze200_${t}`].driverHint, 'device_radiator_valve');
    }
  });
});
