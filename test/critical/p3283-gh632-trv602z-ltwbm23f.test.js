'use strict';
// WHY(P3283 / GH#632): _TZE204_ltwbm23f + TS0601 (TRV601Z/TRV602Z, Homey interview
// clusters 0,4,5,61184) paired as Unknown. It was listed on climate_sensor and
// z2m-coverage marked the couple compacted/dropped. Z2M TRV602Z puts this couple
// and _TZE284_ltwbm23f on the same definition as _TZE204_qyr2m29i
// (zhc tuya.ts c18c32d9 L12037): DP4 setpoint/10, DP5 local temp/10, DP6 battery,
// DP7 child lock, DP2 system mode off=0 auto=4 heat=5. Profile A (DP3 setpoint)
// and the ME167 mode enum are the wrong maps. Extra DPs stay optional.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p)));
const COUPLES = [
  ['_TZE204_ltwbm23f', 'TS0601'],
  ['_TZE284_ltwbm23f', 'TS0601'],
];
const ZHC = 'https://github.com/Koenkk/zigbee-herdsman-converters/blob/c18c32d94c77f683fa768618d1fd32b348fdd7b9/src/devices/tuya.ts#L12037';

function composeOwners(mfr) {
  const want = mfr.toLowerCase();
  const hits = [];
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const p = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    let doc;
    try { doc = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
    const names = doc.zigbee && doc.zigbee.manufacturerName;
    const pids = doc.zigbee && doc.zigbee.productId;
    if (!Array.isArray(names) || !Array.isArray(pids)) continue;
    if (!pids.includes('TS0601')) continue;
    if (names.some((n) => String(n).toLowerCase() === want)) hits.push(id);
  }
  return hits;
}

describe('P3283 GH#632 TRV602Z _TZE204_ltwbm23f / _TZE284_ltwbm23f', () => {
  it('places both exact couples on device_radiator_valve only', () => {
    const trv = read('drivers/device_radiator_valve/driver.compose.json').zigbee;
    assert.ok(trv.productId.includes('TS0601'));
    assert.deepStrictEqual(trv.endpoints['1'].clusters, [0, 4, 5, 61184]);
    for (const [mfr] of COUPLES) {
      assert.ok(trv.manufacturerName.includes(mfr), mfr);
      assert.deepStrictEqual(composeOwners(mfr), ['device_radiator_valve'], mfr);
    }
    const climate = read('drivers/climate_sensor/driver.compose.json').zigbee.manufacturerName
      .map((m) => m.toLowerCase());
    assert.ok(climate.includes('_tze200_ltwbm23f'), 'TZE200 sibling is a different couple');
    assert.ok(!climate.includes('_tze204_ltwbm23f'));
    assert.ok(!climate.includes('_tze284_ltwbm23f'));
  });

  it('pins the couples so publish compaction cannot drop them', () => {
    const pins = read('config/architecture/publish-sacred-keep-couples.json').couples;
    const reported = read('data/leads/reported-couples.json').couples;
    for (const [mfr, pid] of COUPLES) {
      assert.ok(pins.some((c) => c.mfr === mfr && c.pid === pid && c.driverId === 'device_radiator_valve'), mfr);
    }
    assert.ok(pins.some((c) => c.mfr === '_TZE204_qyr2m29i' && c.pid === 'TS0601' && c.driverId === 'device_radiator_valve'));
    assert.ok(reported.some((c) => c.mfr === '_TZE204_ltwbm23f' && c.pid === 'TS0601' && /GH#632/.test(c.source)));
    const map = read('data/driver-mapping-database.json').mfr_index;
    assert.deepStrictEqual(map._tze204_ltwbm23f, ['device_radiator_valve']);
    assert.deepStrictEqual(map._tze284_ltwbm23f, ['device_radiator_valve']);
    const cov = read('data/kb/z2m-coverage.json');
    for (const [mfr, pid] of COUPLES) {
      const row = cov.rows.find((r) => r.k === `${mfr}|${pid}`);
      assert.ok(row, mfr);
      assert.equal(row.b.master[0] === 'compacted' || row.b.master[0] === 'absent', false, mfr);
      assert.equal(row.b.master[1], 'device_radiator_valve');
      assert.notEqual(row.b.master[2], 'dropped');
    }
    const sources = read('data/ssot/couple-sources.json').couples;
    for (const key of ['_tze204_ltwbm23f|TS0601', '_tze284_ltwbm23f|TS0601', '_tze204_qyr2m29i|TS0601']) {
      const rec = sources[key];
      assert.deepStrictEqual(rec.drivers, ['device_radiator_valve'], key);
      assert.ok(JSON.stringify(rec.sources).includes('tuya.ts#L12037') || JSON.stringify(rec.sources).includes(ZHC), key);
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
  return {
    profile: self.dpProfile,
    dp2: g(2).transform ? [0, 1, 4, 5].map((n) => g(2).transform(n)) : null,
    dp4: [g(4).capability, g(4).divisor || null],
    dp5: [g(5).capability, g(5).divisor || null],
    dp6: [g(6).capability, g(6).divisor || null],
    dp7: g(7).capability || null,
    dp15: g(15).capability || g(15).type || null,
  };
};
console.log(JSON.stringify({
  tze204: run('_TZE204_ltwbm23f'),
  tze284: run('_TZE284_ltwbm23f'),
  sibling: run('_TZE204_qyr2m29i'),
  tze200: run('_TZE200_ltwbm23f'),
  me167: run('_TZE200_rxq4iti9'),
}));
`;

  it('resolves TRV602Z couples to DP4/5/6/7, not Profile A or the ME167 mode enum', () => {
    const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse((r.stdout || '').trim().split('\n').pop());
    const expect = {
      profile: 'trv602z',
      dp2: ['off', 'auto', 'auto', 'heat'],
      dp4: ['target_temperature', 10],
      dp5: ['measure_temperature', 10],
      dp6: ['measure_battery', 1],
      dp7: 'child_lock',
      dp15: 'window_open',
    };
    assert.deepStrictEqual(out.tze204, expect);
    assert.deepStrictEqual(out.tze284, expect);
    assert.deepStrictEqual(out.sibling, expect);
    assert.equal(out.tze200.profile, 'standard');
    assert.equal(out.me167.profile, 'me167');
    assert.deepStrictEqual(out.me167.dp2, ['auto', 'heat', 'heat', 'heat']);
    const src = fs.readFileSync(path.join(ROOT, 'drivers/device_radiator_valve/device.js'), 'utf8');
    assert.match(src, /off: 0, auto: 4, heat: 5/);
    assert.match(src, /tuya\.ts#L12037/);
    const base = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedThermostatBase.js'), 'utf8');
    assert.match(base, /dpProfile === 'trv602z'/);
  });
});
