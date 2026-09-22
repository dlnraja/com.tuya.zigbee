'use strict';

/**
 * P2669 — Bastien Homey-side action checklist Contre quoi
 *
 * Contre quoi: tip <1.0.44, HOBEIAN heal missing light/energy, Unknown IEEE
 * map drift, learnmode not guiding Repair after Update.
 */

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2669 Bastien user action checklist', () => {
  it('Hobeian heal: setClass(light) + setEnergy approximation + mesh calm', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/HobeianZg301zHeal.js'), 'utf8');
    assert.ok(src.includes("setClass('light')"));
    assert.ok(src.includes('setEnergy'));
    assert.ok(src.includes('usageConstant'));
    assert.ok(src.includes('calmHobeianMesh'));
  });

  it('switch_1gang learnmode requires Update ≥1.0.44 + Repair', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/switch_1gang/driver.compose.json'), 'utf8'));
    const en = String(c.zigbee?.learnmode?.instruction?.en || '');
    assert.ok(/≥\s*1\.0\.44|>=\s*1\.0\.44|1\.0\.44/.test(en), en);
    assert.ok(/Repair|repair/i.test(en));
    assert.ok(/HOBEIAN|ZG-301Z/i.test(en));
  });

  it('Unknown Nodes map to button_wireless_1 / button_wireless_2', () => {
    const { listUnknownNodeActions, lookupBastienIeee } = require('../../lib/zigbee/BastienIeeeIdentity');
    const acts = listUnknownNodeActions();
    assert.ok(acts.some((a) => a.driver === 'button_wireless_1' && /axpdxqgu/i.test(a.mfr)));
    assert.ok(acts.some((a) => a.driver === 'button_wireless_2' && /dzwgk7e2/i.test(a.mfr)));
    const btn1 = lookupBastienIeee('7c:c6:b6:ff:fe:a3:e1:58');
    assert.strictEqual(btn1.driver, 'button_wireless_1');
    const btn2 = lookupBastienIeee('a4:c1:38:bb:8f:37:ee:17');
    assert.strictEqual(btn2.driver, 'button_wireless_2');
  });

  it('Virtual re-pair couples locked (climate / 4gang / 3btn / eWeLink)', () => {
    const { lookupBastienIeee } = require('../../lib/zigbee/BastienIeeeIdentity');
    assert.strictEqual(lookupBastienIeee('a4:c1:38:f6:3d:2d:c9:79').driver, 'button_wireless_3');
    assert.strictEqual(lookupBastienIeee('a4:c1:38:f7:14:92:cb:c8').driver, 'switch_4gang');
    assert.strictEqual(lookupBastienIeee('a4:c1:38:a0:cf:8c:0f:7a').driver, 'climate_sensor');
    assert.strictEqual(lookupBastienIeee('a4:c1:38:09:4f:ff:ff:ff').driver, 'climate_sensor');
  });

  it('hobeian consistency: 0 errors / 0 warnings at full fleet size', () => {
    const { execSync } = require('child_process');
    const out = execSync(`node "${path.join(ROOT, 'scripts/diag/hobeian-consistency-check.js')}"`, {
      encoding: 'utf8',
    });
    assert.ok(out.includes('Erreurs : 0'), out);
    assert.ok(out.includes('Warnings : 0'), out);
  });

  it('live Bastien couples present in mfs_db (case forms)', () => {
    const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
    const need = [
      ['HOBEIAN', 'ZG-301Z'],
      ['Hobeian', 'ZG-301Z'],
      ['_TZ3000_fllyghyj', 'SNZB-02'],
      ['eWeLink', 'CK-TLSR8656-SS5-01(7014)'],
      ['_TZ3000_vsxvaj9i', 'TS0043'],
      ['_TZ3000_ltt60asa', 'TS0004'],
      ['_TZ3000_axpdxqgu', 'TS0041'],
      ['_TZ3000_dzwgk7e2', 'TS0042'],
    ];
    for (const [mfr, pid] of need) {
      const entry = mfs[mfr] || Object.entries(mfs).find(([k]) => k.toLowerCase() === mfr.toLowerCase())?.[1];
      assert.ok(entry, `mfs missing ${mfr}`);
      const models = entry.modelIds || [];
      assert.ok(models.some((p) => String(p).toLowerCase() === pid.toLowerCase()), `${mfr} missing pid ${pid}`);
    }
  });

  it('npm check:p2669 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2669']);
  });
});
