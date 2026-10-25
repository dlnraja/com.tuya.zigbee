'use strict';
// P3002 — temperature/humidity calibration is applied EXACTLY ONCE, to measured values only.
// Before: UnifiedThermostatBase._handleDP added the TRV offset, then safeSetCapabilityValue →
// _applyCalibration added it again (+1.5 °C showed +3 °C) and also offset target_temperature
// (includes('temperature')). sensor_climate_* drivers pre-scaled with safeMultiply(x) (no factor
// → 0 °C) and clamped humidity 435 → 100 %. Source for device-side TRV calibration: Z2M tuya.ts
// TRV06 (_TZE200_rxq4iti9): DP47 local_temperature_calibration is a device register, DP5
// local_temperature is only ÷10 (no software offset).
// Runs in a child process so no lib module (timers) leaks into the mocha process.
const { describe, it } = require('node:test');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const Z = require('./lib/tuya/TuyaZigbeeDevice');
const base = Object.getPrototypeOf(Z.prototype);
let writes = [];
base.setCapabilityValue = async function (c, v) { writes.push([c, v]); this._caps[c] = v; };
function mk(C, settings, driverId, mfr) {
  const d = Object.create(C.prototype); const caps = {}; const store = {};
  Object.assign(d, {
    _caps: caps, _settings: Object.assign({ zb_manufacturer_name: mfr, zb_model_id: 'TS0601' }, settings),
    getSettings() { return this._settings; }, getSetting(k) { return this._settings[k]; },
    setSettings: async function (o) { Object.assign(this._settings, o); },
    getStore() { return store; }, getData() { return { id: 'x' }; },
    getStoreValue(k) { return store[k] ?? null; }, setStoreValue: async (k, v) => { store[k] = v; },
    log() {}, error() {}, hasCapability: (c) => ['measure_temperature', 'measure_humidity', 'target_temperature', 'measure_battery'].includes(c),
    getCapabilities: () => ['measure_temperature', 'measure_humidity', 'target_temperature', 'measure_battery'],
    getCapabilityValue: (c) => caps[c] ?? null,
    homey: { setTimeout, clearTimeout, setInterval, clearInterval, flow: { getDeviceTriggerCard() { return { trigger: async () => {} }; } } },
    driver: { id: driverId, manifest: {} },
  });
  return d;
}
const pick = (cap) => writes.filter((w) => w[0] === cap).map((w) => w[1]);
const settle = () => new Promise((r) => setTimeout(r, 50));
(async () => {
  const out = {};
  const TRV = require('./drivers/device_radiator_valve/device.js');
  const T = require('./lib/devices/UnifiedThermostatBase');
  const S = require('./lib/devices/UnifiedSensorBase');
  const CC = require('./drivers/sensor_climate_contact/device.js');
  for (const off of [0, 1.5, -2]) {
    // TRV DP5 (÷10) through _handleDP + safeSet, and a target write
    let d = mk(TRV, { temperature_calibration: off }, 'device_radiator_valve', '_TZE200_rxq4iti9');
    writes = []; await d._handleDP(5, 200); await settle();
    await d.safeSetCapabilityValue('target_temperature', 21);
    out['trv_dp5_' + off] = pick('measure_temperature'); out['trv_target_' + off] = pick('target_temperature');
    // TRV echo of DP47 → device-side calibration → raw temperature
    d = mk(TRV, { temperature_calibration: off }, 'device_radiator_valve', '_TZE200_rxq4iti9');
    writes = []; await d._handleDP(47, off * 10); await settle(); await d._handleDP(5, 200); await settle();
    out['trv_echo_' + off] = pick('measure_temperature');
    // Thermostat base, direct safeSet
    d = mk(T, { temperature_calibration: off }, 'thermostat_tuya_dp', '_TZE200_rxq4iti9');
    writes = []; await d.safeSetCapabilityValue('measure_temperature', 20); await d.safeSetCapabilityValue('target_temperature', 21);
    out['thermo_set_' + off] = [pick('measure_temperature'), pick('target_temperature')];
    // Non-TRV sensor: pre-calibrated by a handler, then safeSet → still once
    d = mk(S, { temperature_calibration: off, humidity_calibration: off }, 'sensor_x', '_TZ3000_test');
    writes = [];
    await d.safeSetCapabilityValue('measure_temperature', d._applyCalibration('measure_temperature', 20));
    await d.safeSetCapabilityValue('measure_humidity', 50);
    await d.safeSetCapabilityValue('measure_temperature', 22);
    out['sensor_' + off] = [pick('measure_temperature'), pick('measure_humidity')];
    // sensor_climate_contact DP1 235 (smartDivisor) and DP2 435 (×10 humidity)
    d = mk(CC, { temperature_calibration: off, humidity_calibration: off }, 'sensor_climate_contact', '_TZE200_aycxwiau');
    writes = []; await d._handleDP(1, 235); await settle(); await d._handleDP(2, 435); await settle();
    out['cc_' + off] = [pick('measure_temperature'), pick('measure_humidity')];
  }
  console.log('@@' + JSON.stringify(out));
  process.exit(0);
})().catch((e) => { console.log('@@' + JSON.stringify({ error: e.stack })); process.exit(0); });
`;

let OUT = null;
function result() {
  if (OUT) {return OUT;}
  const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  const line = String(r.stdout || '').split('\n').find((l) => l.startsWith('@@'));
  assert.ok(line, `child produced no result: ${r.stderr}`);
  OUT = JSON.parse(line.slice(2));
  assert.ok(!OUT.error, OUT.error);
  return OUT;
}
const last = (a) => a[a.length - 1];

describe('P3002 calibration applied exactly once', () => {
  it('TRV DP5 → measure_temperature gets the offset once (0 / +1.5 / -2)', () => {
    const o = result();
    assert.strictEqual(last(o.trv_dp5_0), 20);
    assert.strictEqual(last(o['trv_dp5_1.5']), 21.5);
    assert.strictEqual(last(o['trv_dp5_-2']), 18);
  });

  it('target_temperature is never offset', () => {
    const o = result();
    for (const k of ['0', '1.5', '-2']) {
      assert.deepStrictEqual(o[`trv_target_${k}`], [21], `trv ${k}`);
      assert.deepStrictEqual(o[`thermo_set_${k}`][1], [21], `thermostat ${k}`);
    }
  });

  it('thermostat safeSet alone applies the offset once', () => {
    const o = result();
    assert.deepStrictEqual(o.thermo_set_0[0], [20]);
    assert.deepStrictEqual(o['thermo_set_1.5'][0], [21.5]);
    assert.deepStrictEqual(o['thermo_set_-2'][0], [18]);
  });

  it('TRV that echoes its calibration DP applies it in firmware → no app offset', () => {
    const o = result();
    assert.strictEqual(last(o.trv_echo_0), 20);
    assert.strictEqual(last(o['trv_echo_1.5']), 20);
    assert.strictEqual(last(o['trv_echo_-2']), 20);
  });

  it('non-TRV sensor: pre-calibrated value is not re-offset; raw value offset once', () => {
    const o = result();
    assert.deepStrictEqual(o.sensor_0, [[20, 22], [50]]);
    assert.deepStrictEqual(o['sensor_1.5'], [[21.5, 23.5], [51.5]]);
    assert.deepStrictEqual(o['sensor_-2'], [[18, 20], [48]]);
  });

  it('sensor_climate_contact DP1 235 → 23.5 °C (+offset once), DP2 435 → 44 % (P2825 ÷10)', () => {
    const o = result();
    assert.deepStrictEqual(o.cc_0, [[23.5], [44]]);
    assert.deepStrictEqual(o['cc_1.5'], [[25], [45.5]]);
    assert.deepStrictEqual(o['cc_-2'], [[21.5], [42]]);
  });

  it('static guards: no safeMultiply(x) without factor, ZCL 0.01 units, measured-only matcher', () => {
    for (const d of ['sensor_climate_temphumidsensor', 'sensor_climate_lcdtemphumidsensor', 'sensor_climate_contact', 'sensor_contact_climate']) {
      const src = fs.readFileSync(path.join(ROOT, 'drivers', d, 'device.js'), 'utf8');
      assert.ok(!/safeMultiply\(this\._apply(Temp|Hum)Offset\([^)]*\)\)/.test(src), d);
      assert.ok(!/measuredValue \* 100/.test(src), d);
      // P3034: match braced (P3025 eslint curly) AND unbraced forms, so the guard is never vacuous.
      assert.ok(!/if \(v > 100\) \{?\s*return Math\.round\(v\);?\s*\}?/.test(src), d);
    }
    const z = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.ok(z.includes('CalibrationLedger.consume(this, capability, value)'));
    assert.ok(!/if \(capability\.includes\('temperature'\)\)/.test(z));
    const t = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedThermostatBase.js'), 'utf8');
    assert.ok(!/value = this\._applyTrvTemperatureCalibration\(value\);/.test(t));
  });
});
