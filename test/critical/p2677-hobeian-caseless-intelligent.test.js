'use strict';

/**
 * P2677 — Intelligent case-insensitive + Athom case-sensitive brand forms
 *
 * Pourquoi: Athom compose match is case-sensitive; interview may emit HOBEIAN /
 * hobeian / Hobeian / heobian. Runtime must normalize() everything.
 * Contre quoi: missing Title/typo form → "not recognized"; lowercase-only collapse.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TU = require(path.join(ROOT, 'lib', 'utils', 'TuyaNormalizer'));
const CIM = require(path.join(ROOT, 'lib', 'utils', 'CaseInsensitiveMatcher'));
const DB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));

const HOBEIAN_DRIVERS = [
  'switch_1gang', 'switch_2gang', 'switch_3gang', 'curtain_motor',
  'climate_sensor', 'contact_sensor', 'presence_sensor_radar',
  'water_leak_sensor', 'soil_sensor', 'button_wireless_1', 'ir_blaster',
];

const BRAND_FORMS = ['HOBEIAN', 'Hobeian', 'hobeian', 'heobian', 'Heobian'];

describe('P2677 intelligent case-less HOBEIAN / brands', () => {
  it('pairingCaseVariants(HOBEIAN) covers Title + typo Athom forms', () => {
    const forms = TU.pairingCaseVariants('HOBEIAN');
    for (const need of BRAND_FORMS) {
      assert.ok(forms.includes(need), `missing Athom form ${need} in ${JSON.stringify(forms)}`);
    }
    // Typo seed expands to same family
    const fromTypo = TU.pairingCaseVariants('heobian');
    assert.ok(fromTypo.includes('HOBEIAN'));
    assert.ok(TU.equalsIgnoreCase('HOBEIAN', 'heobian'));
    assert.ok(TU.equalsIgnoreCase('Hobeian', 'HOBEIAN'));
  });

  it('brandAthomForms + CaseInsensitiveMatcher shim export intelligence', () => {
    assert.ok(Array.isArray(TU.brandAthomForms('HOBEIAN')));
    assert.equal(TU.brandAthomForms('HOBEIAN').length, 5);
    assert.ok(CIM.brandAthomForms);
    assert.ok(CIM.pairingProductIdVariants);
    const pidForms = TU.pairingProductIdVariants('ZG-301Z-3CH');
    assert.ok(pidForms.includes('ZG-301Z-3CH'));
    assert.ok(pidForms.includes('zg-301z-3ch'));
  });

  it('runtime FP lookup is case-insensitive for HOBEIAN Z2M couples', () => {
    const couples = [
      ['HOBEIAN', 'ZG-301Z-3CH', 'switch_3gang'],
      ['hobeian', 'zg-301z-moto', 'curtain_motor'],
      ['Heobian', 'ZG-210Z', 'presence_sensor_radar'],
      ['heobian', 'ZG-227ZH', 'climate_sensor'],
      ['HOBEIAN', 'WHD02', 'switch_1gang'],
    ];
    for (const [m, p, exp] of couples) {
      const hit = DB.lookup(m, p);
      assert.ok(hit, `FP miss ${m}|${p}`);
      assert.equal(hit.driver, exp, `${m}|${p} → ${hit.driver}`);
    }
  });

  it('every HOBEIAN fleet driver keeps full Athom brand forms on compose', () => {
    for (const driverId of HOBEIAN_DRIVERS) {
      const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
      assert.ok(fs.existsSync(fp), driverId);
      const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const mfr = j.zigbee?.manufacturerName || [];
      for (const form of BRAND_FORMS) {
        assert.ok(mfr.includes(form), `${driverId} missing exact ${form}`);
      }
      assert.ok(TU.hasPairingCaseCoverage(mfr, 'HOBEIAN'), `${driverId} hasPairingCaseCoverage`);
    }
  });

  it('Z2M gap pids stay on canonical drivers (3CH / MOTO / 210Z / climate siblings)', () => {
    const expect = {
      switch_3gang: 'ZG-301Z-3CH',
      curtain_motor: 'ZG-301Z-MOTO',
      presence_sensor_radar: 'ZG-210Z',
      climate_sensor: 'ZG-227ZH',
    };
    for (const [driverId, pid] of Object.entries(expect)) {
      const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8'));
      const pids = j.zigbee?.productId || [];
      assert.ok(
        pids.includes(pid) || pids.some((p) => TU.equalsIgnoreCase(p, pid)),
        `${driverId} missing ${pid}`
      );
    }
  });
});
