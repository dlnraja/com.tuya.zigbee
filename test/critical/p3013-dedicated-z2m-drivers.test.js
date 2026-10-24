'use strict';

// P3013 — four master-only dedicated drivers from Z2M (tuya.ts) definitions.
// Each couple lives on exactly one driver; runtime = base device subclass.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const P = require('../../lib/tuya/profiles/P3013DedicatedZ2MProfiles');

const CASES = [
  { id: 'sauna_thermostat_ae5503', base: 'thermostat_tuya_dp', mfr: '_TZE204_eaasry7v' },
  { id: 'siren_moes_mg_bjq002', base: 'siren', mfr: '_TZE20C_tjz9ad5g' },
  { id: 'switch_wall_6gang_metering', base: 'switch_wall_6gang', mfr: '_TZE284_hbxadcl0' },
  { id: 'valve_novato_zpv01', base: 'water_valve_smart', mfr: '_TZE284_zm8zpwas', family: ['_TZE204_dsagrkvg', '_TZE284_sdvbnmj5'] }, // P3015: whole Z2M ZPV-01 fingerprint list
];

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

test('each P3013 couple is claimed by exactly its dedicated driver (compose + app.json)', () => {
  const app = readJson('app.json');
  const drivers = fs.readdirSync(path.join(ROOT, 'drivers'));
  for (const c of CASES) {
    const compose = readJson(`drivers/${c.id}/driver.compose.json`);
    assert.deepStrictEqual(compose.zigbee.productId, ['TS0601'], c.id);
    assert.ok(compose.zigbee.manufacturerName.includes(c.mfr), `${c.id} claims ${c.mfr}`);
    for (const m of compose.zigbee.manufacturerName) {
      const allowed = [c.mfr, ...c.family || []].map((x) => x.toLowerCase());
      assert.ok(allowed.includes(m.toLowerCase()), `${c.id} only carries case forms of ${allowed.join('/')} (got ${m})`);
    }
    for (const d of drivers) {
      if (d === c.id) {continue;}
      const f = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      if (!fs.existsSync(f)) {continue;}
      const mfrs = (JSON.parse(fs.readFileSync(f, 'utf8')).zigbee?.manufacturerName || []).map((x) => String(x).toLowerCase());
      assert.ok(!mfrs.includes(c.mfr.toLowerCase()), `${c.mfr} must not also live on ${d}`);
    }
    const entry = app.drivers.find((d) => d.id === c.id);
    assert.ok(entry, `${c.id} present in app.json`);
    assert.deepStrictEqual(entry.zigbee.manufacturerName, compose.zigbee.manufacturerName);
    assert.deepStrictEqual(entry.capabilities, compose.capabilities);
    // Spec 002: the pairing manifest lists native clusters only (no 0xEF00/61184 mandatory cluster).
    for (const z of [compose.zigbee, entry.zigbee]) {
      for (const def of Object.values(z.endpoints || {})) {
        assert.ok(!(def.clusters || []).includes(61184), `${c.id} must not list 0xEF00 in endpoint clusters`);
      }
    }
  }
  const ids = app.drivers.map((d) => d.id);
  assert.deepStrictEqual(ids, [...ids].sort(), 'app.json drivers stay sorted');
});

test('dedicated device.js subclasses its base and driver files exist', () => {
  for (const c of CASES) {
    const dir = path.join(ROOT, 'drivers', c.id);
    const src = stripComments(fs.readFileSync(path.join(dir, 'device.js'), 'utf8'));
    assert.ok(src.includes(`require('../${c.base}/device')`), `${c.id} reuses ${c.base}`);
    for (const f of ['driver.js', 'driver.flow.compose.json', 'assets/icon.svg', 'assets/images/small.png', 'assets/images/large.png']) {
      assert.ok(fs.existsSync(path.join(dir, f)), `${c.id}/${f}`);
    }
  }
});

test('AE-5503 RX/TX: raw °C, bool heat and lock', () => {
  const s = P.SAUNA_AE5503;
  assert.strictEqual(s.rx[16].capability, 'target_temperature');
  assert.strictEqual(s.rx[16].divisor, 1);
  assert.strictEqual(s.rx[24].divisor, 1);
  assert.strictEqual(s.rx[1].transform(1), true);
  assert.strictEqual(s.rx[1].transform(false), false);
  assert.deepStrictEqual(s.encodeSetpoint(85.4), { dp: 16, value: 85, type: 'value' });
  assert.deepStrictEqual(s.encodeSetpoint(500), { dp: 16, value: 120, type: 'value' });
  assert.deepStrictEqual(s.encodeOnOff(true), { dp: 1, value: true, type: 'bool' });
  assert.deepStrictEqual(s.encodeChildLock(1), { dp: 40, value: true, type: 'bool' });
});

test('MG-BJQ002 RX/TX: DP1 enum alarm, DP5 volume enum', () => {
  const s = P.SIREN_MG_BJQ002;
  assert.strictEqual(s.rx[1].transform(3), false);
  assert.strictEqual(s.rx[1].transform(2), true);
  assert.strictEqual(s.rx[5].transform(3), 0);
  assert.strictEqual(s.rx[5].transform(2), 1);
  assert.deepStrictEqual(s.encodeAlarm(false, 'sound'), { dp: 1, value: 3, type: 'enum' });
  assert.deepStrictEqual(s.encodeAlarm(true, 'light'), { dp: 1, value: 1, type: 'enum' });
  assert.deepStrictEqual(s.encodeAlarm(true, 'bogus'), { dp: 1, value: 2, type: 'enum' });
  assert.strictEqual(s.encodeVolume(0).value, 3);
  assert.strictEqual(s.encodeVolume(0.33).value, 0);
  assert.strictEqual(s.encodeVolume(0.66).value, 1);
  assert.strictEqual(s.encodeVolume(1).value, 2);
  assert.deepStrictEqual(s.encodeDuration(5000), { dp: 7, value: 1800, type: 'value' });
  assert.deepStrictEqual(s.encodeRingtone(1), { dp: 21, value: 0, type: 'enum' });
  assert.deepStrictEqual(s.encodeLightMode('rainbow'), { dp: 23, value: 0, type: 'enum' });
});

test('hbxadcl0 RX: gangs + metering divisors, DP15 never backlight', () => {
  const s = P.SWITCH6_HBXADCL0;
  for (let g = 1; g <= 6; g++) {assert.ok(String(s.rx[g].capability).startsWith('onoff'));}
  assert.strictEqual(s.rx[20].divisor, 100);
  assert.strictEqual(s.rx[21].divisor, 1000);
  assert.strictEqual(s.rx[22].divisor, 10);
  assert.strictEqual(s.rx[23].divisor, 10);
  assert.strictEqual(s.rx[15].capability, null);
  assert.strictEqual(s.rx[15].internal, 'power_on_behavior');
  assert.deepStrictEqual(s.encodeGang(9, 1), { dp: 6, value: true, type: 'bool' });
});

test('ZPV-01 RX: DP1 onoff, DP8 valve state, DP101 battery', () => {
  const s = P.VALVE_NOVATO_ZPV01;
  assert.strictEqual(s.rx[8].transform(2), 'closed');
  assert.strictEqual(s.rx[8].transform(9), 'unknown');
  assert.strictEqual(s.rx[101].transform(140), 100);
  assert.deepStrictEqual(s.encodeOnOff(0), { dp: 1, value: false, type: 'bool' });
});

test('sendEncoded falls back to _sendTuyaDP and rxTable returns a fresh copy', async () => {
  const calls = [];
  const dev = { _sendTuyaDP: async (dp, v, t) => { calls.push([dp, v, t]); } };
  assert.strictEqual(await P.sendEncoded(dev, { dp: 22, value: true, type: 'bool' }), true);
  assert.deepStrictEqual(calls.at(-1), [22, true, 'bool']);
  assert.strictEqual(await P.sendEncoded(null, { dp: 1 }), false);
  const t = P.rxTable(P.VALVE_NOVATO_ZPV01);
  t[1].capability = 'x';
  assert.strictEqual(P.VALVE_NOVATO_ZPV01.rx[1].capability, 'onoff');
});

// Runtime wiring with hermetic Homey stubs (same pattern as p2864): restore loader + evict cache afterwards.
test('device classes load, subclass their base, and route TX/RX through the P3013 tables', async () => {
  const Module = require('module');
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
  let loaded;
  try {
    loaded = CASES.map((c) => ({ c, Dev: require(`../../drivers/${c.id}/device`), Base: require(`../../drivers/${c.base}/device`) }));
  } finally {
    Module._load = originalLoad;
    for (const k of Object.keys(require.cache)) { if (!cacheBefore.has(k)) { delete require.cache[k]; } }
  }

  for (const { c, Dev, Base } of loaded) {
    assert.ok(Dev.prototype instanceof Base, `${c.id} extends ${c.base}`);
  }
  const byId = Object.fromEntries(loaded.map(({ c, Dev }) => [c.id, Dev]));
  const mk = (Dev, settings = {}) => {
    const d = Object.create(Dev.prototype);
    d.sent = [];
    d.store = {};
    d.getSetting = (k) => settings[k];
    d.getData = () => ({});
    d.log = () => {};
    d.setStoreValue = async (k, v) => { d.store[k] = v; };
    d.tuyaEF00Manager = { sendDP: async (dp, v, t) => { d.sent.push([dp, v, t]); return true; } };
    return d;
  };

  const sauna = mk(byId.sauna_thermostat_ae5503);
  assert.strictEqual(sauna.dpMappings[16].divisor, 1);
  assert.strictEqual(sauna.mainsPowered, true);

  const siren = mk(byId.siren_moes_mg_bjq002, { mg_alarm_mode: 'light' });
  await siren._setOnOff(true);
  await siren._setOnOff(false);
  assert.deepStrictEqual(siren.sent, [[1, 1, 'enum'], [1, 3, 'enum']]);
  siren._handleDP(23, 2);
  assert.strictEqual(siren.store.p3013_light_mode, 2);

  const sw = mk(byId.switch_wall_6gang_metering);
  assert.strictEqual(sw.dpMappings[22].capability, 'measure_power');
  assert.strictEqual(sw.dpMappings[14], undefined, 'base DP14 mapping is not inherited');
  sw._handleDP(15, 1);
  assert.strictEqual(sw.store.p3013_power_on_behavior, 1);

  const valve = mk(byId.valve_novato_zpv01);
  await valve._setOnOff(true);
  assert.deepStrictEqual(valve.sent, [[1, true, 'bool']]);
  valve._handleDP(8, 1);
  assert.strictEqual(valve.store.p3013_valve_state, 'open');
});
