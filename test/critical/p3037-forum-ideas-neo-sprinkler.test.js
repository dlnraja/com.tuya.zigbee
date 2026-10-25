'use strict';

/**
 * P3037 — forum ideas 2026-10-25.
 *  (1) NEO / Nous L14 battery sprinkler timers (Zigbee2MQTT neo.ts NAS-WV03B + NAS-WV03B2) were on
 *      climate_sensor. Forum 140352#2268 (seikossss) reported _TZE284_z7a2jmyy pairing as a tile with no
 *      controls. They now live on water_valve_smart with a per-mfr DP profile (DP1 valve, DP11 battery %,
 *      DP15 total litres only on the litre model).
 *  (2) Battery profile for z7a2jmyy was CR2032/DP4; it is 4xAA with DP11 already in %. The lookup also
 *      ignored case variants (exact-key spread after a caseless hit).
 *  (3) User-reported couples dropped by publish compaction are pinned in publish-sacred-keep-couples.json.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const cacheBefore = new Set(Object.keys(require.cache));
const originalLoad = Module._load;
Module._load = function loadWithHomeyMocks(request, parent, isMain) {
  if (request === 'homey') { return { Device: class {}, Driver: class {} }; }
  if (request === 'homey-zigbeedriver') {
    return {
      ZigBeeDevice: class { constructor() { this.log = () => {}; this.error = () => {}; } },
      ZigBeeDriver: class {},
    };
  }
  if (request === 'zigbee-clusters') {
    return {
      Cluster: class {},
      ZCLDataTypes: { uint8: 0x20, uint16: 0x21, uint32: 0x23, int8: 0x28, int16: 0x29, int32: 0x2b, enum8: 0x30, bitmap8: 0x18, buffer: 0x41, string: 0x42 },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const Device = require('../../drivers/water_valve_smart/device');
Module._load = originalLoad;
for (const k of Object.keys(require.cache)) { if (!cacheBefore.has(k)) { delete require.cache[k]; } }

function fake(mfr) {
  const d = Object.create(Device.prototype);
  d.getSetting = (k) => (k === 'zb_manufacturer_name' ? mfr : null);
  d.getData = () => ({});
  return d;
}

const NEO = ['z7a2jmyy', 'rzrrjkz2', 'uab532m0', 'nnhwcvbk', 'a9ojznj8'];
const lc = (a) => a.map((x) => x.toLowerCase());

describe('P3037 NEO sprinkler on water_valve_smart', () => {
  it('litre model (any case): DP1 valve, DP11 battery %, DP15 -> meter_water m3', () => {
    for (const mfr of ['_TZE284_z7a2jmyy', '_tze204_Z7A2JMYY']) {
      const m = fake(mfr).dpMappings;
      assert.equal(m[1].capability, 'onoff');
      assert.equal(m[1].transform(true), true);
      assert.equal(m[1].transform(false), false);
      assert.equal(m[11].capability, 'measure_battery');
      assert.equal(m[11].transform(87), 87);
      assert.equal(m[11].transform(140), 100);
      assert.equal(m[15].capability, 'meter_water');
      assert.equal(m[15].divisor, 1000000);
      for (const dp of [3, 5, 6, 9, 19, 104]) { assert.equal(m[dp].capability, null, `DP${dp}`); }
    }
  });
  it('gallon models keep DP15 internal (no wrong unit) and still map valve + battery', () => {
    for (const mfr of ['_TZE284_nnhwcvbk', '_TZE204_rzrrjkz2', '_TZE284_uab532m0', '_TZE204_a9ojznj8']) {
      const m = fake(mfr).dpMappings;
      assert.equal(m[1].capability, 'onoff', mfr);
      assert.equal(m[11].capability, 'measure_battery', mfr);
      assert.equal(m[15].capability, null, mfr);
    }
  });
  it('other valves keep their previous map (METERED default battery from mV, Zemismart DP13)', () => {
    const def = fake('_TZE200_a7sghmms').dpMappings;
    assert.equal(def[11].transform(3000), 100);
    assert.equal(def[15].setting, 'auto_clean');
    assert.equal(fake('_TZE284_vuwtqx0t').dpMappings[13].capability, 'onoff');
  });
  it('one driver per couple: in water_valve_smart (app.json + compose), gone from climate_sensor', () => {
    const app = readJson('app.json');
    const drv = (id) => app.drivers.find((d) => d.id === id);
    for (const src of [
      { ws: readJson('drivers/water_valve_smart/driver.compose.json'), cs: readJson('drivers/climate_sensor/driver.compose.json') },
      { ws: drv('water_valve_smart'), cs: drv('climate_sensor') },
    ]) {
      const ws = lc(src.ws.zigbee.manufacturerName);
      const cs = lc(src.cs.zigbee.manufacturerName);
      assert.ok(src.ws.zigbee.productId.includes('TS0601'));
      for (const s of NEO) {
        for (const pre of ['_tze204_', '_tze284_']) {
          assert.ok(ws.includes(pre + s), `${pre + s} on water_valve_smart`);
          assert.ok(!cs.includes(pre + s), `${pre + s} not on climate_sensor`);
        }
      }
    }
  });
  it('no 0xEF00 required at pairing: compose endpoints unchanged', () => {
    const ws = readJson('drivers/water_valve_smart/driver.compose.json');
    assert.deepEqual(Object.keys(ws.zigbee.endpoints), ['1']);
  });
  it('couple-driver-pins + curated removal carry the source', () => {
    const pin = readJson('config/architecture/couple-driver-pins.json').pins.find((p) => p.id === 'p3037-neo-sprinkler');
    assert.ok(pin && pin.driver === 'water_valve_smart' && /neo\.ts/.test(pin.source) && /140352\/2268/.test(pin.source));
    const rem = readJson('config/architecture/curated-couple-removals.json').removals
      .find((r) => r.driver === 'climate_sensor' && /P3037/.test(r.why));
    assert.ok(rem && lc(rem.mfr).includes('_tze284_z7a2jmyy'));
  });
});

describe('P3037 battery profile z7a2jmyy', () => {
  it('4xAA, DP11, direct %, any case', () => {
    const { lookupProfile } = require('../../lib/battery/BatteryMasterEngine');
    for (const m of ['_TZE204_z7a2jmyy', '_TZE284_z7a2jmyy', '_tze284_Z7A2JMYY']) {
      const p = lookupProfile(m, 'TS0601');
      assert.equal(p.chemistry, 'AA', m);
      assert.equal(p.dpId, 11, m);
      assert.equal(p.algorithm, 'direct', m);
    }
  });
  it('caseless hit returns the full profile for other entries too', () => {
    const { lookupProfile } = require('../../lib/battery/BatteryMasterEngine');
    assert.equal(lookupProfile('_tze200_N8DLJORX', 'TS0601').chemistry, 'AA');
  });
});

describe('P3037 sacred pins for user-reported couples', () => {
  const want = [
    ['_TZE200_yenbr4om', 'TS0601', 'curtain_motor'],
    ['_TZE2841000000_8se38w3c', 'TS0601', 'climate_sensor'],
    ['_TZE284_z7a2jmyy', 'TS0601', 'water_valve_smart'],
    ['_TZ3000_kstbkt6a', 'TS0207', 'water_leak_sensor'],
    ['_TZE204_ijxvkhd0', 'TS0601', 'presence_sensor_radar'],
    ['_TZE284_awepdiwi', 'TS0601', 'soil_sensor'],
  ];
  for (const pre of ['_TZE204_', '_TZE284_']) {
    for (const s of ['z7a2jmyy', 'rzrrjkz2', 'uab532m0', 'a9ojznj8', 'nnhwcvbk']) {
      if (!want.some((w) => w[0] === pre + s)) want.push([pre + s, 'TS0601', 'water_valve_smart']);
    }
  }
  const sacred = readJson('config/architecture/publish-sacred-keep-couples.json').couples;
  for (const [mfr, pid, driver] of want) {
    it(`${mfr}|${pid} pinned on ${driver}, exact case, present in that driver`, () => {
      const c = sacred.find((x) => x.mfr === mfr && x.pid === pid);
      assert.ok(c, 'pin exists');
      assert.equal(c.driverId, driver);
      assert.ok(c.note && c.note.length > 20, 'note cites the source');
      const z = readJson(`drivers/${driver}/driver.compose.json`).zigbee;
      assert.ok(z.manufacturerName.includes(mfr), 'exact-case mfr in compose');
      assert.ok(z.productId.includes(pid), 'pid in compose');
    });
  }
});
