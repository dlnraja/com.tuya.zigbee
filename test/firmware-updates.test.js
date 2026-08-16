'use strict';

/**
 * Tests — P92.70 / P194 native Homey Zigbee firmware updates (v13.2.0+)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const DRIVERS = path.join(ROOT, 'drivers');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function discoverFirmwareDrivers() {
  const found = [];
  for (const id of fs.readdirSync(DRIVERS)) {
    const compose = readJson(path.join(DRIVERS, id, 'driver.compose.json'));
    const fw = readJson(path.join(DRIVERS, id, 'driver.firmware.compose.json'));
    const updates = []
      .concat((compose && compose.firmwareUpdates && compose.firmwareUpdates.updates) || [])
      .concat((fw && fw.updates) || []);
    if (updates.length) {found.push({ id, compose, updates });}
  }
  return found;
}

describe('P92.70 / P194 — native firmware updates', () => {

  it('discovers at least the known safe OTA drivers', () => {
    const ids = discoverFirmwareDrivers().map((d) => d.id);
    for (const required of ['usb_dongle_triple', 'radiator_valve', 'wall_curtain_switch', 'switch_1gang', 'thermostatic_radiator_valve']) {
      assert.ok(ids.includes(required), `${required} still ships firmwareUpdates`);
    }
    assert.ok(!ids.includes('button_wireless_2'), 'plug image must not sit on button_wireless_2');
    assert.ok(!ids.includes('curtain_motor_shutter'), 'cover image lives on wall_curtain_switch');
  });

  it('every firmwareUpdates entry matches the homey-lib 2.51 schema', () => {
    for (const d of discoverFirmwareDrivers()) {
      for (const u of d.updates) {
        assert.ok(u.changelog && (typeof u.changelog.en === 'string'), `${d.id}: changelog.en`);
        assert.ok(Array.isArray(u.files) && u.files.length >= 1, `${d.id}: >=1 file`);
        for (const f of u.files) {
          assert.strictEqual(f.name, path.basename(f.name), `${d.id}: name is basename only`);
          assert.match(f.integrity, /^sha256:[0-9a-f]{64}$/, `${d.id}: integrity sha256:<hex>`);
          assert.strictEqual(typeof f.fileVersion, 'number');
          assert.strictEqual(typeof f.imageType, 'number');
          assert.strictEqual(typeof f.manufacturerCode, 'number');
          assert.strictEqual(typeof f.size, 'number');
        }
      }
    }
  });

  it('firmware files exist in drivers/<id>/assets/firmware/ with matching integrity + header', () => {
    for (const d of discoverFirmwareDrivers()) {
      for (const u of d.updates) {
        for (const f of u.files) {
          const fp = path.join(DRIVERS, d.id, 'assets', 'firmware', f.name);
          assert.ok(fs.existsSync(fp), `${fp} exists`);
          const buf = fs.readFileSync(fp);
          const sha = crypto.createHash('sha256').update(buf).digest('hex');
          assert.strictEqual(f.integrity, `sha256:${sha}`, `${d.id}/${f.name}: integrity matches`);
          assert.strictEqual(buf.length, f.size, `${d.id}/${f.name}: size matches`);
          assert.strictEqual(buf.readUInt32LE(0), 0x0BEEF11E, 'OTA magic');
          assert.strictEqual(buf.readUInt16LE(10), f.manufacturerCode, 'header mfr code');
          assert.strictEqual(buf.readUInt16LE(12), f.imageType, 'header imageType');
          assert.strictEqual(buf.readUInt32LE(14), f.fileVersion, 'header fileVersion');
        }
      }
    }
  });

  it('device manufacturerName/productId are strict subsets of the driver zigbee lists', () => {
    for (const d of discoverFirmwareDrivers()) {
      const mfrs = new Set((d.compose.zigbee && d.compose.zigbee.manufacturerName) || []);
      const pids = new Set((d.compose.zigbee && d.compose.zigbee.productId) || []);
      for (const u of d.updates) {
        for (const m of [].concat(u.device.manufacturerName)) {
          assert.ok(mfrs.has(m), `${d.id}: ${m} in driver manufacturerName`);
        }
        for (const p of [].concat(u.device.productId)) {
          assert.ok(pids.has(p), `${d.id}: ${p} in driver productId`);
        }
      }
    }
  });

  it('plug/breaker images do not advertise button or cover productIds', () => {
    const banned = new Set(['TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS004F', 'TS0215A', 'TS130F']);
    for (const d of discoverFirmwareDrivers()) {
      for (const u of d.updates) {
        const name = String(((u.files || [])[0] || {}).name || '').toLowerCase();
        if (!/plug|breaker/.test(name)) {continue;}
        const bad = [].concat(u.device.productId || []).filter((p) => banned.has(p));
        assert.deepStrictEqual(bad, [], `${d.id}: plug image must not target ${bad.join(',')}`);
      }
    }
  });

  it('pvvx community firmwares are excluded (fileVersion 20459521)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/build-firmware-updates.js'), 'utf8');
    assert.ok(src.includes('20459521'), 'pvvx exclusion present in generator');
    assert.ok(src.includes('assets') && src.includes('firmware'), 'generator writes assets/firmware');
  });

  it('generator is wired into self-improve and placeholders are gone', () => {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/self-improve.yml'), 'utf8');
    assert.ok(wf.includes('build-firmware-updates.js --apply'), 'self-improve runs the generator');
    assert.ok(!fs.existsSync(path.join(ROOT, 'drivers/plug/driver.firmware.compose.json')),
      'invalid plug placeholder removed');
    assert.ok(!fs.existsSync(path.join(ROOT, 'drivers/rain_sensor/driver.firmware.compose.json')),
      'invalid rain_sensor placeholder removed');
  });

  it('toolchain: homey CLI >= 4.x and homey-lib >= 2.51', () => {
    const pkg = require(path.join(ROOT, 'package.json'));
    assert.ok(require('homey/package.json').version.startsWith('4.'), 'CLI 4.x installed');
    assert.ok(require('homey-lib/package.json').version >= '2.51', 'homey-lib 2.51+ installed');
    assert.ok(pkg, 'package.json present');
  });
});
