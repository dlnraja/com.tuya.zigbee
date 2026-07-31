'use strict';

/**
 * Tests — P92.70 native Homey Zigbee firmware updates (v13.2.0+)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const DRIVERS_WITH_FW = [
  'usb_dongle_triple', 'radiator_valve', 'curtain_motor_shutter',
  'switch_1gang', 'button_wireless_2', 'thermostatic_radiator_valve'
];

describe('P92.70 — native firmware updates', () => {

  it('every firmwareUpdates entry matches the homey-lib 2.51 schema', () => {
    for (const d of DRIVERS_WITH_FW) {
      const app = require(path.join(ROOT, 'app.json'));
      const driver = app.drivers.find((x) => x.id === d);
      assert.ok(driver.firmwareUpdates, `${d} has firmwareUpdates`);
      for (const u of driver.firmwareUpdates.updates) {
        assert.ok(u.changelog && (typeof u.changelog.en === 'string'), `${d}: changelog.en`);
        assert.ok(Array.isArray(u.files) && u.files.length >= 1, `${d}: >=1 file`);
        for (const f of u.files) {
          assert.strictEqual(f.name, path.basename(f.name), `${d}: name is basename only`);
          assert.match(f.integrity, /^sha256:[0-9a-f]{64}$/, `${d}: integrity sha256:<hex>`);
          assert.strictEqual(typeof f.fileVersion, 'number');
          assert.strictEqual(typeof f.imageType, 'number');
          assert.strictEqual(typeof f.manufacturerCode, 'number');
          assert.strictEqual(typeof f.size, 'number');
        }
      }
    }
  });

  it('firmware files exist in drivers/<id>/assets/firmware/ with matching integrity + header', () => {
    const app = require(path.join(ROOT, 'app.json'));
    for (const d of DRIVERS_WITH_FW) {
      const driver = app.drivers.find((x) => x.id === d);
      for (const u of driver.firmwareUpdates.updates) {
        for (const f of u.files) {
          const fp = path.join(ROOT, 'drivers', d, 'assets', 'firmware', f.name);
          assert.ok(fs.existsSync(fp), `${fp} exists`);
          const buf = fs.readFileSync(fp);
          const sha = crypto.createHash('sha256').update(buf).digest('hex');
          assert.strictEqual(f.integrity, `sha256:${sha}`, `${d}/${f.name}: integrity matches`);
          assert.strictEqual(buf.length, f.size, `${d}/${f.name}: size matches`);
          // OTA header: magic + real manufacturerCode/imageType/fileVersion
          assert.strictEqual(buf.readUInt32LE(0), 0x0BEEF11E, 'OTA magic');
          assert.strictEqual(buf.readUInt16LE(10), f.manufacturerCode, 'header mfr code');
          assert.strictEqual(buf.readUInt16LE(12), f.imageType, 'header imageType');
          assert.strictEqual(buf.readUInt32LE(14), f.fileVersion, 'header fileVersion');
        }
      }
    }
  });

  it('device manufacturerName/productId are strict subsets of the driver zigbee lists', () => {
    const app = require(path.join(ROOT, 'app.json'));
    for (const d of DRIVERS_WITH_FW) {
      const driver = app.drivers.find((x) => x.id === d);
      const mfrs = new Set(driver.zigbee.manufacturerName);
      const pids = new Set(driver.zigbee.productId);
      for (const u of driver.firmwareUpdates.updates) {
        for (const m of [].concat(u.device.manufacturerName)) {
          assert.ok(mfrs.has(m), `${d}: ${m} in driver manufacturerName`);
        }
        for (const p of [].concat(u.device.productId)) {
          assert.ok(pids.has(p), `${d}: ${p} in driver productId`);
        }
      }
    }
  });

  it('pvvx community firmwares are excluded (fileVersion 20459521)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/build-firmware-updates.js'), 'utf8');
    assert.ok(src.includes('20459521'), 'pvvx exclusion present in generator');
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
