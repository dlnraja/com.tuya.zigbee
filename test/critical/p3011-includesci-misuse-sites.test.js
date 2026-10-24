'use strict';

/**
 * P3011 — includesCI(array, value) argument-order misuse (always false) fixed
 * additively at 6 sites. Sources:
 *  - Z2M hobeian.ts ZG-102ZL (_TZE200_pay2byax) DP1 contact = valueConverter.inverse
 *  - Z2M tuya.ts TS0601_soil (oitavov2 family) DP5 temperature = valueConverter.raw (°C)
 *    https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const CDI = require('../../lib/sensors/ContactDefaultInvert');
const STS = require('../../lib/sensors/SoilTempScale');
const TU = require('../../lib/utils/TuyaNormalizer');

describe('P3011 includesCI misuse sites', () => {
  it('root cause: includesCI(string, id) is always false, containsCI works', () => {
    assert.strictEqual(TU.includesCI('_TZE200_pay2byax', '_TZE200_pay2byax'), false);
    assert.strictEqual(TU.containsCI('_TZE284_iadro9bf', 'iadro9bf'), true);
  });

  it('contact: DP-inverted ZG-102ZL gets default inversion, XOR with user setting', () => {
    assert.deepStrictEqual(CDI.resolveContactInvert('_TZE200_PAY2BYAX', false, false),
      { invertedByDefault: true, invertContact: true, userExplicitInvert: false });
    assert.deepStrictEqual(CDI.resolveContactInvert('_TZE200_pay2byax', true, false),
      { invertedByDefault: true, invertContact: false, userExplicitInvert: false });
  });

  it('contact: IAS-listed _TZ3000 ids are NOT locally inverted (AlarmPolarityManager owns them)', () => {
    for (const id of CDI.IAS_POLARITY_LISTED) {
      assert.strictEqual(CDI.isIasPolarityListed(id), true);
      assert.deepStrictEqual(CDI.resolveContactInvert(id, false, false),
        { invertedByDefault: false, invertContact: false, userExplicitInvert: false });
    }
    const { INVERTED_POLARITY } = require('../../lib/managers/AlarmPolarityManager');
    if (Array.isArray(INVERTED_POLARITY)) {
      for (const id of [...CDI.IAS_POLARITY_LISTED, ...CDI.DP_INVERTED_BY_DEFAULT]) {
        assert.ok(INVERTED_POLARITY.includes(id), id);
      }
    }
  });

  it('contact: unlisted ids unchanged (user setting only)', () => {
    assert.deepStrictEqual(CDI.resolveContactInvert('_TZ3000_abcdefgh', true, false),
      { invertedByDefault: false, invertContact: true, userExplicitInvert: true });
    assert.deepStrictEqual(CDI.resolveContactInvert('', false, false),
      { invertedByDefault: false, invertContact: false, userExplicitInvert: false });
  });

  it('contact drivers use the helper, no reversed includesCI left', () => {
    for (const d of ['contact_sensor_zigbee', 'sensor_contact_water']) {
      const s = read(`drivers/${d}/device.js`);
      assert.ok(s.includes("require('../../lib/sensors/ContactDefaultInvert')"), d);
      assert.ok(/resolveContactInvert\(mfr, userInvert, userReverse\)/.test(s), d);
      assert.ok(!/\.some\(id => includesCI\(mfr, id\)\)/.test(s.replace(/\/\/.*$/gm, '')), d);
    }
  });

  it('soil: oitavov2 raw °C when plausible, legacy scaling otherwise', () => {
    assert.deepStrictEqual(STS.scaleSoilDp5('_TZE200_oitavov2', 22), { temp: 22, mode: 'raw_celsius' });
    assert.deepStrictEqual(STS.scaleSoilDp5('_tze284_OITAVOV2', -5), { temp: -5, mode: 'raw_celsius' });
    // implausible raw for oitavov2 -> documented auto-detect fallback (detect-and-merge)
    assert.deepStrictEqual(STS.scaleSoilDp5('_TZE200_oitavov2', 220), { temp: 22, mode: 'auto' });
    // non-listed mfr -> documented auto scale (>1000 ÷100, >100 ÷10, else raw)
    assert.deepStrictEqual(STS.scaleSoilDp5('_TZE200_other', 22), { temp: 22, mode: 'auto' });
    assert.strictEqual(STS.scaleSoilDp5('_TZE200_other', 235).temp, 23.5);
    assert.strictEqual(STS.scaleSoilDp5('_TZE200_other', 2350).temp, 23.5);
    for (const d of ['sensor_lcdtemphumidsensor_soil', 'device_air_purifier_soil']) {
      const s = read(`drivers/${d}/device.js`);
      assert.ok(s.includes('scaleSoilDp5(mfr, parsedValue)'), d);
      assert.ok(!/\bincludesCI\(mfr, '_tze200_oitavov2'\)/.test(s.replace(/\/\/.*$/gm, '')), d);
      // safeMultiply was never imported in these drivers (ReferenceError) — must not be called
      assert.ok(!/safeMultiply\(/.test(s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), d);
      assert.ok(s.includes("return (celsius * safeDivide(9, 5)) + 32;"), d);
    }
  });

  it('radar: dead _throttleMotionSpam removed (P3015) — no caller, no reversed includesCI left', () => {
    const s = read('drivers/sensor_presence_radar/device.js');
    const code = s.replace(/\/\/.*$/gm, '');
    assert.ok(!code.includes('_throttleMotionSpam'), 'method and callers gone');
    assert.ok(!code.includes("CI.includesCI(mfr, 'iadro9bf')"));
  });

  it('knob: TS004F check uses containsCI', () => {
    const s = read('drivers/smart_knob_rotary/device.js');
    assert.ok(s.includes("CI.containsCI(modelId, 'TS004F')"));
    assert.ok(!s.includes("CI.includesCI(modelId, 'TS004F')"));
  });

  it('OTA: string or array manufacturerName restriction both match (exact CI)', () => {
    const P = require('../../lib/ota/TuyaXiaomiOTAProvider');
    const f = P._otaMfrList;
    assert.deepStrictEqual(f('_TZ3000_abc'), ['_TZ3000_abc']);
    assert.deepStrictEqual(f(['a', 'b']), ['a', 'b']);
    assert.deepStrictEqual(f(undefined), []);
    assert.strictEqual(TU.includesCI(f('_TZ3000_ABC'), '_tz3000_abc'), true);
    assert.strictEqual(TU.includesCI(f('_TZ3000_ABC'), '_tz3000_abd'), false);
    const s = read('lib/ota/TuyaXiaomiOTAProvider.js');
    assert.strictEqual((s.match(/includesCI\(_otaMfrList\(img\.manufacturerName\), manufacturerName\)/g) || []).length, 2);
  });
});
