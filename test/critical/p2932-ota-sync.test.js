'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
// P2932 — OTA audit fixes (Tuya MCU OTA frames, Homey Device Updates routing,
// firmware manifests) and the branch sync matrix tool.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('P2932 OTA + sync', () => {
  const frames = require('../../lib/ota/TuyaMcuOtaFrames');

  it('recognises the herdsman Tuya MCU OTA commands 0x12-0x15 only', () => {
    for (const c of [0x12, 0x13, 0x14, 0x15]) assert.ok(frames.isMcuOtaCommand(c));
    for (const c of [0x01, 0x02, 0x06, 0x0B, 0x24, 0x25]) assert.ok(!frames.isMcuOtaCommand(c));
  });

  it('parses mcuOtaBlockDataRequest and mcuOtaResult, never throws on short payloads', () => {
    const req = Buffer.from('0007' + '0102030405060708' + '03' + '00000400' + '30', 'hex');
    assert.deepStrictEqual(frames.parseMcuOtaFrame(0x13, req), { command: 'mcuOtaBlockDataRequest', seq: 7, key: '0102030405060708', version: 3, offset: 1024, size: 48 });
    const res = Buffer.from('0008' + '00' + '0102030405060708' + '03', 'hex');
    assert.strictEqual(frames.parseMcuOtaFrame(0x15, { data: res }).status, 0);
    assert.strictEqual(frames.parseMcuOtaFrame(0x13, Buffer.from('00', 'hex')), null);
    assert.strictEqual(frames.parseMcuOtaFrame(0x13, undefined), null);
  });

  it('TuyaBoundCluster keeps MCU OTA frames away from the DP parser', () => {
    const src = read('lib/clusters/TuyaBoundCluster.js');
    const guard = src.indexOf('_McuOta.isMcuOtaCommand(cmdId)');
    const unknown = src.indexOf('if (cmdId !== undefined && !knownCommands.includes(cmdId))');
    assert.ok(guard > 0 && guard < unknown, 'guard runs before the unknown->DP path');
  });

  describe('OTAUpdateManager routes to Homey Device Updates', () => {
    const OTAUpdateManager = require('../../lib/ota/OTAUpdateManager');
    const fw = { updates: [{ device: { manufacturerName: ['_TZ3000_x3ewpzyr'], productId: ['TS0001'] },
      files: [{ fileVersion: 74, imageType: 54179, manufacturerCode: 4417, name: 'a.bin' }] }] };
    const mkDevice = (mfr, pid, clusterCalls) => ({
      driver: { manifest: { firmwareUpdates: fw } },
      getData: () => ({ id: 'd1', protocol: 'zigbee' }), getName: () => 'dev',
      getSetting: (k) => ({ zb_manufacturer_name: mfr, zb_model_id: pid }[k]),
      zclNode: { manufacturerId: 4417, endpoints: { 1: { clusters: { otaUpdate: {
        imageType: 54179, currentFileVersion: 60,
        queryNextImageRequest: () => clusterCalls.push('query'),
      } } } } },
    });
    const homey = { log() {}, error() {}, notifications: { createNotification: async () => {} } };

    it('selects the bundled image with the SDK rules (exact mfr/pid, code, type, newer)', () => {
      const m = new OTAUpdateManager(homey);
      assert.deepStrictEqual(m.findBundledNativeUpdate(mkDevice('_TZ3000_x3ewpzyr', 'TS0001', [])), { fileVersion: 74, name: 'a.bin' });
      assert.strictEqual(m.findBundledNativeUpdate(mkDevice('_TZ3000_other', 'TS0001', [])), null);
      assert.strictEqual(m.findBundledNativeUpdate(mkDevice('_TZ3000_x3ewpzyr', 'TS0002', [])), null);
    });

    it('never sends OTA commands to the device and never claims an update started', async () => {
      const calls = [];
      const notes = [];
      const m = new OTAUpdateManager({ ...homey, notifications: { createNotification: async (n) => notes.push(n) } });
      m.repository.findImage = async () => null;
      const r = await m.performUpdate(mkDevice('_TZ3000_x3ewpzyr', 'TS0001', calls));
      assert.strictEqual(r.code, 'OTA_USE_HOMEY_DEVICE_UPDATES');
      assert.strictEqual(r.nativeVersion, 74);
      assert.deepStrictEqual(calls, []);
      assert.ok(!notes.some((n) => /started/i.test(n.excerpt)));
    });
  });

  describe('firmware manifests', () => {
    const ota = require('../../scripts/maintenance/ota-images');
    const entries = ota.collectManifests(ROOT);

    it('every listed image is present, matches its integrity and OTA header', () => {
      assert.ok(entries.length >= 9);
      for (const e of entries) {
        const buf = fs.readFileSync(path.join(ROOT, 'drivers', e.driver, 'assets', 'firmware', e.file.name));
        const r = ota.checkEntry(e, buf, null);
        assert.deepStrictEqual(r.errors, [], `${e.driver}/${e.file.name}`);
      }
    });

    it('TRV image lists the canonical index spelling _TZE200_ckud7u2l', () => {
      const e = entries.find((x) => x.driver === 'thermostatic_radiator_valve');
      assert.ok([].concat(e.device.manufacturerName).includes('_TZE200_ckud7u2l'));
    });

    it('battery drivers that ship an image carry a wakeInstruction', () => {
      for (const d of ['water_leak_sensor', 'radiator_valve', 'thermostatic_radiator_valve']) {
        assert.ok(entries.filter((e) => e.driver === d).every((e) => e.wake), d);
      }
    });

    it('checkEntry rejects a forged header and a wrong digest', () => {
      const b = Buffer.alloc(64);
      b.writeUInt32LE(0x0BEEF11E, 0); b.writeUInt16LE(4417, 10); b.writeUInt16LE(1, 12); b.writeUInt32LE(5, 14);
      const good = { driver: 'x', device: {}, file: { manufacturerCode: 4417, imageType: 1, fileVersion: 5, size: 64, integrity: 'sha256:' + crypto.createHash('sha256').update(b).digest('hex') } };
      assert.deepStrictEqual(ota.checkEntry(good, b, null).errors, []);
      const bad = { ...good, file: { ...good.file, fileVersion: 6, integrity: 'sha256:00' } };
      assert.strictEqual(ota.checkEntry(bad, b, null).errors.length, 2);
      const idx = { manufacturerCode: 4417, imageType: 1, fileVersion: 5, manufacturerName: ['_TZ3000_a'] };
      const outside = { ...good, device: { manufacturerName: ['_TZ3000_b'] } };
      assert.ok(ota.checkEntry(outside, b, idx).errors.some((x) => /outside the index/.test(x)));
    });
  });

  it('sync-matrix tool extracts P-tags and ignores generated files', () => {
    const sm = require('../../scripts/maintenance/sync-matrix');
    assert.deepStrictEqual(sm.tagsOf('fix(P2930b): x P2930 and P2930'), ['P2930b', 'P2930']);
    assert.ok(sm.IGNORE.some((r) => r.test('app.json')));
    assert.ok(!sm.IGNORE.some((r) => r.test('lib/ota/OTAUpdateManager.js')));
  });
});
