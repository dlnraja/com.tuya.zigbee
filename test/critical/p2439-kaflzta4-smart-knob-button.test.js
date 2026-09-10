'use strict';

/**
 * P2439 — Homey diag a342c411: smart_knob button press not working
 * Couple: _TZ3000_kaflzta4 + TS004F on smart_knob @ 9.0.846
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  classifyOperatingFamily,
} = require('../../lib/zigbee/DeviceOperatingMode');
const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');

function mockDevice({ mfr, pid, driver }) {
  return {
    driver: { id: driver },
    getSetting(k) {
      if (k === 'zb_manufacturer_name') return mfr;
      if (k === 'zb_model_id') return pid;
      return null;
    },
    getStoreValue() { return null; },
    getData() { return { manufacturerName: mfr, productId: pid }; },
  };
}

describe('P2439 — kaflzta4+TS004F scene mode (diag a342c411)', () => {
  it('fingerprint locks smart_knob', () => {
    const hit = DeviceFingerprintDB.lookup('_TZ3000_kaflzta4', 'TS004F');
    assert.strictEqual(hit.driver, 'smart_knob');
  });

  it('kaflzta4 is ts004f with writeSceneAttr (not knob skip8004)', () => {
    const fam = classifyOperatingFamily(mockDevice({
      mfr: '_TZ3000_kaflzta4',
      pid: 'TS004F',
      driver: 'smart_knob',
    }));
    assert.strictEqual(fam.family, 'ts004f');
    assert.strictEqual(fam.writeSceneAttr, true);
    assert.strictEqual(fam.defaultMode, 'scene');
  });

  it('ABSENT mfr + smart_knob + TS004F still enables scene write', () => {
    const fam = classifyOperatingFamily(mockDevice({
      mfr: '',
      pid: 'TS004F',
      driver: 'smart_knob',
    }));
    assert.strictEqual(fam.writeSceneAttr, true);
    assert.strictEqual(fam.family, 'ts004f');
  });

  it('true rotary knob mfr still skips 0x8004', () => {
    const fam = classifyOperatingFamily(mockDevice({
      mfr: '_TZ3000_402vrq2i',
      pid: 'TS004F',
      driver: 'smart_knob',
    }));
    assert.strictEqual(fam.family, 'knob');
    assert.strictEqual(fam.writeSceneAttr, false);
  });

  it('PhysicalButtonMixin profile exists for kaflzta4', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../../lib/mixins/PhysicalButtonMixin.js'),
      'utf8',
    );
    assert.ok(src.includes("'_TZ3000_kaflzta4'"));
    assert.ok(src.includes('P2439_diag_a342c411'));
  });
});
