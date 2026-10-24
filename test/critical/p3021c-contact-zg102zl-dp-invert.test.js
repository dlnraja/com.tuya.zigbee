'use strict';

/**
 * P3021c — forum #2134 (Peter, diag f1e5b12d): HOBEIAN ZG-102ZL door contact
 * inverted on the DP1 path (Z2M hobeian.ts: [1, "contact", valueConverter.inverse]).
 */
require('../_support/homey-stub');
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const CDI = require('../../lib/sensors/ContactDefaultInvert');
const { resolvePolarity } = require('../../lib/managers/AlarmPolarityManager');

function fakeDevice({ mfr, pid, settings = {}, store = {} }) {
  return {
    getSetting: (k) => {
      if (k === 'zb_manufacturer_name') {return mfr;}
      if (k === 'zb_model_id') {return pid;}
      return settings[k];
    },
    getStoreValue: (k) => store[k],
    getData: () => ({}),
  };
}

describe('P3021c ContactDefaultInvert — HOBEIAN|ZG-102ZL DP1 (forum #2134)', () => {
  it('exact couple only, caseless', () => {
    assert.strictEqual(CDI.isDpCoupleInvertedByDefault('HOBEIAN', 'ZG-102ZL'), true);
    assert.strictEqual(CDI.isDpCoupleInvertedByDefault('hobeian', 'zg-102zl'), true);
    assert.strictEqual(CDI.isDpCoupleInvertedByDefault('HOBEIAN', 'ZG-102Z'), false, 'IAS sibling untouched');
    assert.strictEqual(CDI.isDpCoupleInvertedByDefault('HOBEIAN', 'TS0203'), false);
    assert.strictEqual(CDI.isDpCoupleInvertedByDefault('HOBEIAN', ''), false);
  });

  it('auto mode: AlarmPolarityManager says normal, DP default inverts', () => {
    const pol = resolvePolarity(fakeDevice({ mfr: 'HOBEIAN', pid: 'ZG-102ZL' }), 'contact');
    assert.strictEqual(pol.shouldInvert, false, 'IAS-side curated normal unchanged');
    const ov = CDI.resolveDpCoupleDefault(pol);
    assert.ok(ov);
    assert.strictEqual(ov.invertContact, true);
  });

  it('user checkbox XORs the default; explicit mode and learned polarity win', () => {
    const polX = resolvePolarity(fakeDevice({ mfr: 'HOBEIAN', pid: 'ZG-102ZL', settings: { invert_contact: true } }), 'contact');
    assert.strictEqual(CDI.resolveDpCoupleDefault(polX).invertContact, false);
    const polN = resolvePolarity(fakeDevice({ mfr: 'HOBEIAN', pid: 'ZG-102ZL', settings: { alarm_polarity: 'normal' } }), 'contact');
    assert.strictEqual(CDI.resolveDpCoupleDefault(polN), null);
    assert.strictEqual(CDI.resolveDpCoupleDefault({ mode: 'auto', learned: false, mfr: 'HOBEIAN', pid: 'ZG-102ZL' }), null);
    assert.strictEqual(CDI.resolveDpCoupleDefault(null), null);
  });

  it('contact_sensor applies it on the DP path only', () => {
    const Dev = require('../../drivers/contact_sensor/device');
    const d = Object.create(Dev.prototype);
    d._invertContact = false; d._userExplicitInvert = false; d._invertedByDefault = false;
    const pol = resolvePolarity(fakeDevice({ mfr: 'HOBEIAN', pid: 'ZG-102ZL' }), 'contact');
    d._applyDpCoupleDefault(pol);
    assert.strictEqual(d._invertContact, true);
    assert.strictEqual(d._userExplicitInvert, false);
    assert.ok(/dp_couple_default_inverted/.test(pol.reason));
    const d2 = Object.create(Dev.prototype);
    d2._invertContact = false;
    d2._applyDpCoupleDefault(resolvePolarity(fakeDevice({ mfr: 'HOBEIAN', pid: 'ZG-102Z' }), 'contact'));
    assert.strictEqual(d2._invertContact, false, 'IAS ZG-102Z (Lasse_K) stays normal');
    const src = require('fs').readFileSync(require.resolve('../../drivers/contact_sensor/device'), 'utf8');
    assert.ok(/isIAS \? false :/.test(src), 'IAS frames are never inverted locally');
  });
});
