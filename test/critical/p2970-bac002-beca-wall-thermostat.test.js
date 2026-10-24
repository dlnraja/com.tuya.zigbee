'use strict';

/**
 * P2970 — Umberto Maffii (store suggestion): Beca BAC-006AZB pairs but is not a thermostat.
 * Source: Z2M herdsman tuya.ts "BAC-002-ALZB" (fingerprint TS0601 _TZE200_dzuqwsyg/_TZE204_dzuqwsyg,
 * whitelabel Beca BAC-003) + Z2M discussion #25308 (BAC-006AZB = _TZE204_dzuqwsyg).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function loadDeviceClass() {
  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === 'zigbee-clusters') return { Cluster: { addCluster() {} } };
    if (/lib\/TuyaSpecificClusterDevice$/.test(request)) return class Base {};
    if (/lib\/(TuyaSpecificCluster|TuyaOnOffCluster)$/.test(request)) return {};
    if (/TuyaDeviceHelper$/.test(request)) return { getDeviceMeta: () => ({}) };
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const p = require.resolve(path.join(ROOT, 'drivers/wall_thermostat/device.js'));
    delete require.cache[p];
    return require(p);
  } finally {
    Module._load = originalLoad;
  }
}

function makeDevice(Cls, mfr) {
  const d = Object.create(Cls.prototype);
  const store = {};
  const caps = new Set(['onoff', 'target_temperature', 'measure_temperature', 'thermostat_programming', 'child_lock']);
  d.values = {};
  d.tx = [];
  d.log = () => {};
  d.error = () => {};
  d.getSetting = (k) => (k === 'zb_manufacturer_name' ? mfr : k === 'zb_model_id' ? 'TS0601' : undefined);
  d.getSettings = () => ({ zb_manufacturer_name: mfr, zb_model_id: 'TS0601' });
  d.getData = () => ({});
  d.getStoreValue = (k) => store[k];
  d.setStoreValue = async (k, v) => { store[k] = v; };
  d.hasCapability = (c) => caps.has(c);
  d.addCapability = async (c) => { caps.add(c); };
  d.safeSetCapabilityValue = async (c, v) => { d.values[c] = v; };
  d.registerCapabilityListener = (c, fn) => { (d.listeners = d.listeners || {})[c] = fn; };
  d.io = {
    sendDP: async (dp, value, opts) => { d.tx.push({ dp, value, type: opts.dpType }); return true; },
    requestDP: async () => true,
  };
  return d;
}

describe('P2970 Beca BAC-006AZB / BAC-002-ALZB on wall_thermostat', function () {
  const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

  it('couples live in wall_thermostat only (moved out of switch_1gang + device_radiator_valve)', () => {
    const wall = read('drivers/wall_thermostat/driver.compose.json').zigbee;
    for (const m of ['_TZE204_dzuqwsyg', '_TZE200_dzuqwsyg']) {
      assert.ok(wall.manufacturerName.includes(m), `${m} on wall_thermostat`);
    }
    assert.ok(wall.productId.includes('TS0601'));
    for (const id of ['switch_1gang', 'device_radiator_valve']) {
      const z = read(`drivers/${id}/driver.compose.json`).zigbee;
      assert.ok(!z.manufacturerName.some((m) => /dzuqwsyg/i.test(m)), `${id} must not claim dzuqwsyg`);
    }
    const fp = read('lib/tuya/fingerprints.json');
    assert.strictEqual(fp._TZE204_dzuqwsyg.driverId, 'wall_thermostat');
    assert.strictEqual(fp._TZE200_dzuqwsyg.driverId, 'wall_thermostat');
  });

  it('move script is idempotent (--check green)', () => {
    const { execFileSync } = require('child_process');
    execFileSync(process.execPath, [path.join(ROOT, 'tools/ci/p2970-bac002-wall-thermostat.js'), '--check'], { stdio: 'pipe' });
  });

  it('BAC-002 couple arms FCU + BAC-002 profile with whole-degree setpoint', () => {
    const Cls = loadDeviceClass();
    const d = makeDevice(Cls, '_TZE204_dzuqwsyg');
    d._refreshBac002Flag();
    assert.strictEqual(d._bac002, true);
    assert.strictEqual(d._isFcuCouple(), true);
    assert.strictEqual(d._dp16Scale, 'raw');
    d._fcu = true;
    d._installDpMappings();
    assert.strictEqual(d.dpMappings[16].divisor, 1, 'DP16 not /10 on BAC-002');
    assert.strictEqual(d.dpMappings[4].capability, 'thermostat_programming');
    assert.ok(d.dpMappings[101].internal, 'DP101 = schedule, not a capability');
  });

  it('TYBAC-006 couple keeps the original FCU map (no regression)', () => {
    const Cls = loadDeviceClass();
    const d = makeDevice(Cls, '_TZE204_mpbki2zm');
    d._refreshBac002Flag();
    assert.ok(!d._bac002);
    d._fcu = true;
    d._installDpMappings();
    assert.strictEqual(d.dpMappings[16].divisor, 10);
    assert.strictEqual(d.dpMappings[101].capability, 'thermostat_programming');
  });

  it('RX: DP16 22 -> 22 °C, DP4 true -> manual, DP101 schedule ignored, DP24 /10', async () => {
    const Cls = loadDeviceClass();
    const d = makeDevice(Cls, '_TZE200_dzuqwsyg');
    d._refreshBac002Flag();
    d._fcu = true;
    await d._processFcuResponse(16, 22);
    assert.strictEqual(d.values.target_temperature, 22);
    await d._processFcuResponse(16, 225);
    assert.strictEqual(d.values.target_temperature, 22.5, 'tenths tolerated if firmware sends them');
    await d._processFcuResponse(4, true);
    assert.strictEqual(d.values.thermostat_programming, '0');
    await d._processFcuResponse(4, false);
    assert.strictEqual(d.values.thermostat_programming, '1');
    d.values.thermostat_programming = 'x';
    await d._processFcuResponse(101, Buffer.alloc(36));
    assert.strictEqual(d.values.thermostat_programming, 'x', 'DP101 must not flip programming');
    assert.ok(!d._fcuManualDpConfirmed, 'DP101 must not confirm a manual bool');
    await d._processFcuResponse(24, 215);
    assert.strictEqual(d.values.measure_temperature, 21.5);
  });

  it('TX: setpoint raw °C on DP16, programming on DP4, never a bool on DP101', async () => {
    const Cls = loadDeviceClass();
    const d = makeDevice(Cls, '_TZE204_dzuqwsyg');
    d._refreshBac002Flag();
    d._fcu = true;
    d._fcuManualDpConfirmed = true; // even if a stale store flag says so
    d._registerSharedListeners();
    await d.listeners.target_temperature(21);
    await d.listeners.thermostat_programming('0');
    await d.listeners.onoff(false);
    assert.deepStrictEqual(d.tx.find((t) => t.dp === 16), { dp: 16, value: 21, type: 'value' });
    assert.deepStrictEqual(d.tx.find((t) => t.dp === 4), { dp: 4, value: true, type: 'bool' });
    assert.ok(!d.tx.some((t) => t.dp === 101), 'no DP101 TX on BAC-002');
  });

  it('DeviceFingerprintDB + credits', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/DeviceFingerprintDB.js'), 'utf8');
    assert.ok(/'_TZE204_dzuqwsyg\|TS0601': \{ driver: 'wall_thermostat'/.test(src));
    const credits = fs.readFileSync(path.join(ROOT, 'CREDITS.md'), 'utf8');
    assert.ok(/P2970/.test(credits) && /Umberto/i.test(credits));
  });
});
