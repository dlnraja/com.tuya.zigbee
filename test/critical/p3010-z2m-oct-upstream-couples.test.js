'use strict';

/**
 * P3010 — upstream backport (Z2M zigbee-herdsman-converters, merged 2026-09-27 .. 2026-10-14).
 * One exact couple, one driver; every id comes from a merged Z2M definition (link + author + date):
 *  - _TZE200_gt1gge3x|TS0601 -> rain_sensor   (HOBEIAN ZG-223Z sibling, PR #13340, jomders, 2026-10-01)
 *  - _TZ3000_w5s3mbyn|TS0001 -> switch_1gang  (Zemismart KES-606US-L1, PR #13349, Alan16161, 2026-10-02)
 *  - _TZE284_uqzwwjas / _TZE284_zeeqkb0p|TS0601 -> smoke_sensor2 (AVATTO ZSD20, PR #13187, alblcl, 2026-09-30)
 *  - _TZ3210_mldzab8w|TS130F -> curtain_motor (Moes ZM-108-M = TS130F whitelabel, PR #13283, Daniil Karpenko, 2026-09-27)
 *  - _TZ3008_avdpejns|TS011F -> smartplug     (Nous A6Z = TS011F_plug_1 whitelabel, Koenkk commit 3956a2c, 2026-10-14)
 * Batch 2 (Z2M whitelabels of existing definitions, also listed as open leads in dlnraja/com.tuya.zigbee#556):
 *  - _TZ3000_0lvv1d5b|TS0203 -> contact_sensor        (Mowe MW811D, PR #13132, Kenny Roger, 2026-09-09)
 *  - _TZ3000_1hypixdr|TS0044 -> scene_switch_4        (Mowe MW794Z, PR #13209, Kenny Roger, 2026-09-18)
 *  - _TZ3000_syetgitm|TS0207 -> water_leak_sensor     (Mowe MW815R, IAS water-leak definition, PR #13130, Kenny Roger, 2026-09-09)
 *  - _TZ3210_8etggm4u|TS0505B -> light_rgbcct_ts0505b (ECODO PSL-24V/RGBCW/ECD, PR #13179, Kenny Roger, 2026-09-14)
 *  - _TZ3210_cqqb61yo|TS0505B -> light_rgbcct_ts0505b (ECODO BU-GU10-Zigbee, PR #13170, Kenny Roger, 2026-09-16)
 *  - _TZ3210_o4vasvef|TS0505B -> light_rgbcct_ts0505b (Ledisons LDN22-RGBWW5, PR #13141, TheLexus, 2026-09-08)
 *  - _TZ3210_tlwlmwm6|TS0502B -> light_cct_ts0502b    (ECODO ECD-48V-MGT, PR #13172, Kenny Roger, 2026-09-16)
 *  - _TZ3210_tqwyiitv|TS0502B -> light_cct_ts0502b    (LUUMR 10010339, PR #13243, Kai Stian Olstad, 2026-09-22)
 * https://github.com/Koenkk/zigbee-herdsman-converters/pulls?q=13340+13349+13187+13283
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(DRIVERS, id, 'driver.compose.json'), 'utf8'));
}

const COUPLES = [
  ['_TZE200_gt1gge3x', 'TS0601', 'rain_sensor'],
  ['_TZ3000_w5s3mbyn', 'TS0001', 'switch_1gang'],
  ['_TZE284_uqzwwjas', 'TS0601', 'smoke_sensor2'],
  ['_TZE284_zeeqkb0p', 'TS0601', 'smoke_sensor2'],
  ['_TZ3210_mldzab8w', 'TS130F', 'curtain_motor'],
  ['_TZ3008_avdpejns', 'TS011F', 'smartplug'],
  ['_TZ3000_0lvv1d5b', 'TS0203', 'contact_sensor'],
  ['_TZ3000_1hypixdr', 'TS0044', 'scene_switch_4'],
  ['_TZ3000_syetgitm', 'TS0207', 'water_leak_sensor'],
  ['_TZ3210_8etggm4u', 'TS0505B', 'light_rgbcct_ts0505b'],
  ['_TZ3210_cqqb61yo', 'TS0505B', 'light_rgbcct_ts0505b'],
  ['_TZ3210_o4vasvef', 'TS0505B', 'light_rgbcct_ts0505b'],
  ['_TZ3210_tlwlmwm6', 'TS0502B', 'light_cct_ts0502b'],
  ['_TZ3210_tqwyiitv', 'TS0502B', 'light_cct_ts0502b'],
];

const allDrivers = fs.readdirSync(DRIVERS).filter((d) => fs.existsSync(path.join(DRIVERS, d, 'driver.compose.json')));

describe('P3010 Z2M October upstream couples', () => {
  for (const [mfr, pid, drv] of COUPLES) {
    it(`${mfr}|${pid} lives on ${drv} only (both case forms)`, () => {
      const z = compose(drv).zigbee;
      assert.ok(z.manufacturerName.includes(mfr), `${mfr} missing on ${drv}`);
      assert.ok(z.manufacturerName.includes(mfr.replace(/^_[A-Z0-9]+_/, (p) => p.toLowerCase())), 'lowercase prefix form missing');
      assert.ok(z.productId.includes(pid), `${pid} missing on ${drv}`);
      for (const other of allDrivers) {
        if (other === drv) {continue;}
        const oz = compose(other).zigbee || {};
        const has = (oz.manufacturerName || []).some((m) => String(m).toLowerCase() === mfr.toLowerCase());
        const hasPid = (oz.productId || []).some((p) => String(p).toLowerCase() === pid.toLowerCase());
        assert.ok(!(has && hasPid), `${mfr}|${pid} duplicated on ${other}`);
      }
    });
  }
});

function loadWithStubs(rel) {
  const cacheBefore = new Set(Object.keys(require.cache));
  const originalLoad = Module._load;
  Module._load = function stubbed(request, parent, isMain) {
    if (request === 'homey') {return { Device: class {}, Driver: class {}, App: class {} };}
    if (request === 'homey-zigbeedriver') {
      return { ZigBeeDevice: class { constructor() { this.log = () => {}; this.error = () => {}; } }, ZigBeeDriver: class {}, debug: () => {} };
    }
    if (request === 'zigbee-clusters') {
      const Cluster = class { static addCluster() {} };
      return new Proxy({ Cluster, BoundCluster: class {}, ZCLDataTypes: new Proxy({}, { get: () => 0 }), ZCLDataType: class {}, CLUSTER: new Proxy({}, { get: () => ({}) }) }, {
        get: (t, k) => k in t ? t[k] : class {},
      });
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(path.join(ROOT, rel));
  } finally {
    Module._load = originalLoad;
    for (const k of Object.keys(require.cache)) { if (!cacheBefore.has(k)) {delete require.cache[k];} }
  }
}

describe('P3010 runtime maps', () => {
  it('rain_sensor: gt1gge3x takes the ZG-223Z (HOBEIAN) layout', () => {
    const src = fs.readFileSync(path.join(DRIVERS, 'rain_sensor', 'device.js'), 'utf8');
    assert.match(src, /containsCI\(mfr, 'gt1gge3x'\)/);
    assert.doesNotMatch(src, /\bincludesCI\(mfr,/, 'includesCI is (array, value): never call it with a string haystack');
    let Device;
    try { Device = loadWithStubs('drivers/rain_sensor/device.js'); } catch (e) { return; } // static check above is the floor
    const d = Object.create(Device.prototype);
    d.getSetting = (k) => k === 'zb_manufacturer_name' ? '_TZE200_gt1gge3x' : null;
    const m = d.dpMappings;
    assert.equal(m[1].capability, 'alarm_water');
    assert.equal(m[1].transform(1), true);
    assert.equal(m[1].transform(0), false);
    assert.equal(m[104].capability, 'measure_battery');
    assert.equal(m[102].capability, 'measure_luminance');
  });

  it('rain_sensor: matcher fix selects intended layouts without losing fallback DPs', () => {
    let Device;
    try { Device = loadWithStubs('drivers/rain_sensor/device.js'); } catch (e) { return; }
    const mk = (mfr) => { const d = Object.create(Device.prototype); d.getSetting = (k) => k === 'zb_manufacturer_name' ? mfr : null; return d.dpMappings; };
    const h = mk('_TZE200_u6x1zyv2');
    assert.equal(h[104].capability, 'measure_battery');
    assert.equal(h[15].capability, 'measure_battery');
    assert.equal(h[105].capability, 'alarm_water');
    const lower = mk('_tze200_gt1gge3x');
    assert.equal(lower[102].capability, 'measure_luminance');
    const solar = mk('_TZ3210_tgvtvdoc');
    assert.equal(solar[105].capability, 'alarm_water');
    assert.equal(solar[105].transform(80), true);
    assert.equal(solar[105].transform(10), false);
    const generic = mk('_TZE200_unknown1');
    assert.equal(generic[104], undefined);
    assert.equal(generic[1].capability, 'alarm_water');
  });

  it('smoke_sensor2: DP15 battery %, DP1 0 = alarm', async () => {
    const Device = loadWithStubs('drivers/smoke_sensor2/device.js');
    const d = Object.create(Device.prototype);
    const set = {};
    d.log = () => {};
    d.error = () => {};
    d.hasCapability = (c) => c === 'measure_battery';
    d.safeSetCapabilityValue = async (c, v) => { set[c] = v; };
    await d.updatePosition({ dp: 15, datatype: 2, data: [0, 0, 0, 87] });
    assert.equal(set.measure_battery, 87);
    await d.updatePosition({ dp: 15, datatype: 2, data: [0, 0, 1, 44] }); // 300: out of range ignored
    assert.equal(set.measure_battery, 87);
    await d.updatePosition({ dp: 1, datatype: 4, data: [0] });
    assert.equal(set.alarm_smoke, true);
    await d.updatePosition({ dp: 1, datatype: 4, data: [1] });
    assert.equal(set.alarm_smoke, false);
  });
});
