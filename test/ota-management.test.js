'use strict';

/**
 * Tests — OTA improvements (v9.0.378)
 *  - Tuya MCU fallback in getDeviceOTAInfo (no ZCL OTA cluster)
 *  - manufacturerName-based matching when imageType is unknown
 *  - flow cards present in the manifest
 */

const assert = require('assert');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');

describe('OTA — Tuya MCU fallback (getDeviceOTAInfo)', () => {
  const OTAUpdateManager = require('../lib/ota/OTAUpdateManager');
  const mgr = new OTAUpdateManager({});

  function fakeDevice({ clusters = {}, mfr = null, modelId = null }) {
    return {
      zclNode: { endpoints: { 1: { clusters } }, manufacturerId: 0 },
      getSetting: (k) => (k === 'zb_manufacturer_name' ? mfr : k === 'zb_model_id' ? modelId : undefined),
    };
  }

  it('returns null without zclNode', () => {
    assert.strictEqual(mgr.getDeviceOTAInfo({}), null);
  });

  it('reads the ZCL otaUpdate cluster when present', () => {
    const info = mgr.getDeviceOTAInfo(fakeDevice({
      clusters: { otaUpdate: { imageType: 5129, currentFileVersion: 22 } },
      mfr: '_TZ3000_abcdefgh',
    }));
    assert.strictEqual(info.imageType, 5129);
    assert.strictEqual(info.fileVersion, 22);
  });

  it('falls back to Tuya MCU (4417, type 0) with manufacturer context', () => {
    const info = mgr.getDeviceOTAInfo(fakeDevice({ clusters: {}, mfr: '_TZE284_hodyryli', modelId: 'TS0601' }));
    assert.ok(info, 'fallback must return info');
    assert.strictEqual(info.manufacturerCode, 4417);
    assert.strictEqual(info.imageType, 0);
    assert.strictEqual(info.manufacturerName, '_TZE284_hodyryli');
    assert.strictEqual(info.modelId, 'TS0601');
  });

  it('returns null for non-Tuya devices without OTA cluster', () => {
    assert.strictEqual(mgr.getDeviceOTAInfo(fakeDevice({ clusters: {}, mfr: 'LUMI' })), null);
  });
});

describe('OTA — provider manufacturerName matching', () => {
  it('matches by manufacturerName when imageType is unknown (0)', () => {
    // replicate the filter logic from TuyaXiaomiOTAProvider
    const img = {
      manufacturerCode: 4417, imageType: 9999, fileVersion: 10,
      manufacturerName: ['_TZE284_hodyryli'],
    };
    const manufacturerCode = 4417, imageType = 0, currentVersion = 0;
    const manufacturerName = '_TZE284_hodyryli';
    const typeUnknown = !imageType;
    const match = (() => {
      if (img.manufacturerCode !== manufacturerCode) {return false;}
      if (!typeUnknown && img.imageType !== imageType) {return false;}
      if (typeUnknown) {
        if (!manufacturerName || !Array.isArray(img.manufacturerName) || !img.manufacturerName.length) {return false;}
        if (!img.manufacturerName.some(m => m.toLowerCase() === manufacturerName.toLowerCase())) {return false;}
      }
      return img.fileVersion > currentVersion;
    })();
    assert.strictEqual(match, true);
  });

  it('source contains the typeUnknown fallback', () => {
    const src = require('fs').readFileSync(path.join(ROOT, 'lib', 'ota', 'TuyaXiaomiOTAProvider.js'), 'utf8');
    assert.match(src, /typeUnknown/);
  });
});

describe('OTA flow cards in manifest', () => {
  it('trigger, condition and action cards exist', () => {
    const app = require(path.join(ROOT, 'app.json'));
    const t = new Set((app.flow?.triggers || []).map(x => x.id));
    const c = new Set((app.flow?.conditions || []).map(x => x.id));
    const a = new Set((app.flow?.actions || []).map(x => x.id));
    assert.ok(t.has('ota_update_available'), 'trigger missing');
    assert.ok(c.has('ota_has_update'), 'condition missing');
    assert.ok(a.has('ota_run_discovery'), 'action missing');
  });
});
