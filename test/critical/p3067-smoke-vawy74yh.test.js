'use strict';
// P3067 family 4 (smoke/CO): _TZE200/_TZE204/_TZE284_vawy74yh is the Moes ZSS-HM-SSD01 smoke detector
// (Z2M moes.ts, ZHA tuya_smoke.py, blakadder Moes_ZSS-HM-SSD01, Hubitat Tuya Zigbee Smoke Detector):
// DP1 0 = smoke, DP15 battery %. It was listed in co_sensor (DP1 -> alarm_co) and climate_sensor
// (DP1 -> temperature). TS0601 couples now live only in smoke_sensor; already paired devices get
// alarm_smoke from DP1 in their old driver.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const compose = (d) => require(path.join(ROOT, 'drivers', d, 'driver.compose.json')).zigbee;
const MFRS = ['_TZE200_vawy74yh', '_TZE204_vawy74yh', '_TZE284_vawy74yh'];

describe('P3067 Moes ZSS-HM-SSD01 smoke (vawy74yh)', () => {
  it('only smoke_sensor lists the couples, both casings', () => {
    const smoke = compose('smoke_sensor');
    assert.ok(smoke.productId.includes('TS0601'));
    for (const m of MFRS) {
      assert.ok(smoke.manufacturerName.includes(m), m);
      assert.ok(smoke.manufacturerName.includes(m.toLowerCase()), m.toLowerCase());
    }
    for (const d of ['co_sensor', 'climate_sensor']) {
      assert.ok(!compose(d).manufacturerName.some((m) => /vawy74yh/i.test(m)), d);
    }
  });

  // Runtime checks run in a child process (homey stubbed) so no driver module loads into shared mocha.
  const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const out = {};
const S = require('./drivers/smoke_sensor/device.js');
out.smoke = ['_TZE200_vawy74yh', '_TZE204_vawy74yh', '_TZE284_vawy74yh'].map((m) => {
  const p = S.smokeProfileFor(m);
  return [p, S.mapSmokeDp(p, 1, 0), S.mapSmokeDp(p, 1, 1), S.mapSmokeDp(p, 15, 80), S.mapSmokeDp(p, 18, 0)];
});
const CO = require('./drivers/co_sensor/device.js');
const get = (C) => Object.getOwnPropertyDescriptor(C.prototype, 'dpMappings').get;
const co = (mfr) => { const m = get(CO).call({ _isSmokeOnly: CO.prototype._isSmokeOnly, getSetting: () => mfr });
  return [m[1].capability, m[1].transform ? [m[1].transform(0), m[1].transform(1)] : null]; };
out.co = [co('_TZE200_vawy74yh'), co('_TZE204_l4daccga')];
const CL = require('./drivers/climate_sensor/device.js');
out.cl = ['_TZE204_vawy74yh', '_TZE284_VAWY74YH', '_TZE200_abcdefgh'].map((mfr) => {
  const m = get(CL).call({ _manufacturerName: () => mfr });
  return [m[1].capability, m[1].transform ? m[1].transform(0) : null];
});
console.log(JSON.stringify(out));
`;
  const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  const out = JSON.parse((r.stdout || '').trim().split('\n').pop() || '{}');

  it('smoke_sensor maps DP1 0 = smoke and DP15 battery', () => {
    assert.strictEqual(r.status, 0, r.stderr);
    for (const row of out.smoke) {
      assert.deepStrictEqual(row, ['ssd01', ['alarm_smoke', true], ['alarm_smoke', false], ['measure_battery', 80], null]);
    }
  });

  it('already paired devices: DP1 drives alarm_smoke in co_sensor / climate_sensor, other couples unchanged', () => {
    assert.deepStrictEqual(out.co, [['alarm_smoke', [true, false]], ['alarm_co', null]]);
    assert.deepStrictEqual(out.cl, [['alarm_smoke', true], ['alarm_smoke', true], ['measure_temperature', null]]);
  });

  it('fingerprint hints name smoke_sensor / TS0601', () => {
    const fp = require(path.join(ROOT, 'lib/tuya/fingerprints.json'));
    for (const k of ['_TZE204_VAWY74YH', '_TZE284_VAWY74YH']) {
      const shard = require(path.join(ROOT, `lib/tuya/fp-shards/${k.slice(1, 7)}_v.json`));
      for (const db of [fp, shard]) {
        assert.strictEqual(db[k].driverId, 'smoke_sensor');
        assert.deepStrictEqual(db[k].modelIds, ['TS0601']);
      }
    }
  });
});
