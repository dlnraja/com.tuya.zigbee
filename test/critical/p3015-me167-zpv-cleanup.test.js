'use strict';

// P3015 — 2026-10-24
//  - me167 dpProfile: condition was me167Ids.some(id => includesCI(me167Ids, id)) (always true, mfr ignored).
//    Fixed to read mfr; genuine ME167 ids, AR331Pro _TZE284_nbv4tdaz (Z2M tuya.ts#L5882, same DP layout)
//    and empty/unknown mfr keep 'me167' (= previous effective behaviour); a known other Tuya id gets 'standard'.
//  - Novato ZPV-01 (Z2M tuya.ts#L22298: _TZE204_dsagrkvg, _TZE284_zm8zpwas, _TZE284_sdvbnmj5) on its dedicated
//    driver only; battery 4 x AA alkaline (Novato catalogue https://novato.com.tr/novato-katalog-v1.pdf,
//    ZHA quirk battery_qty=4 AA, HA community thread 892596).
//  - dead code: soil unused imports, radar _throttleMotionSpam (no caller).
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

function profileOf(driver, mfr) {
  const src = read(`drivers/${driver}/device.js`);
  const start = src.indexOf('  get dpProfile() {');
  const end = src.indexOf('\n  }\n', start);
  const body = src.slice(start + '  get dpProfile() {'.length, end);
  const consts = src.match(/const ME167_LAYOUT_COMPAT = \[[^\]]*\];/)[0];
  const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');
  // eslint-disable-next-line no-new-func
  const fn = new Function('includesCI', `${consts}\nreturn function(){${body}\n};`)(includesCI);
  return fn.call({ getSetting: () => mfr, getStoreValue: () => null });
}

describe('P3015 me167 profile reads the manufacturer', () => {
  for (const d of ['device_air_purifier_radiator', 'climate_sensor_device']) {
    it(`${d}: genuine ME167 ids (any case/padding) stay me167`, () => {
      for (const m of ['_TZE284_o3x45p96', '_tze284_P3DBF6QS', ' _TZE200_p3dbf6qs ', '_TZE284_rv6iuyxb', '_TZE284_c6wv4xyo', '_TZE284_hvaxb2tc', '_TZE204_o3x45p96']) {
        assert.strictEqual(profileOf(d, m), 'me167', m);
      }
    });
    it(`${d}: couples served by the driver keep the historic profile`, () => {
      assert.strictEqual(profileOf(d, '_TZE284_nbv4tdaz'), 'me167');
      assert.strictEqual(profileOf(d, '_tze284_NBV4TDAZ'), 'me167');
      assert.strictEqual(profileOf(d, ''), 'me167');
      assert.strictEqual(profileOf(d, '_generic_climate_sensor_device'), 'me167');
    });
    it(`${d}: a known non-ME167 Tuya id is no longer forced to me167`, () => {
      assert.strictEqual(profileOf(d, '_TZE200_abcdefgh'), 'standard');
      assert.ok(!read(`drivers/${d}/device.js`).replace(/\/\/.*$/gm, '').includes('me167Ids.some(id => includesCI(me167Ids, id))'));
    });
    it(`${d}: every manifest couple of this driver resolves to me167 (no behaviour change)`, () => {
      const z = readJson(`drivers/${d}/driver.compose.json`).zigbee;
      for (const m of z.manufacturerName) {assert.strictEqual(profileOf(d, m), 'me167', m);}
    });
  }
});

describe('P3015 Novato ZPV-01 dedicated driver', { skip: !fs.existsSync(path.join(ROOT, 'drivers/valve_novato_zpv01')) }, () => {
  it('battery 4 x AA in compose and app.json', () => {
    assert.deepStrictEqual(readJson('drivers/valve_novato_zpv01/driver.compose.json').energy.batteries, ['AA', 'AA', 'AA', 'AA']);
    const a = readJson('app.json').drivers.find((x) => x.id === 'valve_novato_zpv01');
    assert.deepStrictEqual(a.energy.batteries, ['AA', 'AA', 'AA', 'AA']);
  });
  it('dsagrkvg / sdvbnmj5 left the TRV and smart-valve drivers and are curated', () => {
    const lc = (d) => readJson(`drivers/${d}/driver.compose.json`).zigbee.manufacturerName.map((m) => m.toLowerCase().trim());
    assert.ok(!lc('device_radiator_valve').includes('_tze204_dsagrkvg'));
    assert.ok(!lc('water_valve_smart').includes('_tze284_sdvbnmj5'));
    const cur = readJson('config/architecture/curated-couple-removals.json').removals;
    assert.ok(cur.some((r) => r.driver === 'device_radiator_valve' && r.mfr.includes('_TZE204_dsagrkvg')));
    assert.ok(cur.some((r) => r.driver === 'water_valve_smart' && r.mfr.includes('_TZE284_sdvbnmj5')));
  });
});

describe('P3015 dead-code cleanup', () => {
  it('soil: unused imports removed, module still loads', () => {
    const s = read('drivers/device_air_purifier_soil/device.js');
    assert.ok(!/\bsafeParse\b/.test(s));
    assert.ok(!s.includes("require('../../lib/constants/ZigbeeConstants.js')"));
    assert.ok(s.includes('async onSettings({ newSettings, changedKeys })'));
    const code = s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/\bCLUSTERS\./.test(code), 'CLUSTERS only in comments');
    assert.ok(!/\boldSettings\b/.test(code));
  });
  it('soil + radar modules still parse', () => {
    for (const f of ['drivers/device_air_purifier_soil/device.js', 'drivers/sensor_presence_radar/device.js']) {
      assert.doesNotThrow(() => new (require('vm').Script)(Module.wrap(read(f)), { filename: f }), f);
    }
  });
});
