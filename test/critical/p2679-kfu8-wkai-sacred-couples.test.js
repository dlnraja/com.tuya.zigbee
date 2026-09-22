'use strict';
/**
 * P2679 — Contre quoi: soft-hypotheses / compose must lock sacred couples
 *   _TZ3000_kfu8zapd+TS0044 → button_wireless_4 (NOT scene_switch_4)
 *   _TZ3000_wkai4ga5+TS0044 → scene_switch_4 (NOT button_wireless_4)
 * Athom case forms stay on the canonical driver only (no cross-steal).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function loadCompose(driverId) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function mfrForms(compose, needle) {
  const n = String(needle).toLowerCase();
  return (compose.zigbee?.manufacturerName || []).filter((m) => String(m).toLowerCase().includes(n));
}

describe('P2679 kfu8zapd / wkai4ga5 sacred couples', () => {
  it('soft-hypotheses point to canonical drivers', () => {
    const soft = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/enrichment/soft-hypotheses-missing-pid.json'), 'utf8')
    );
    const byMfr = Object.fromEntries((soft.hypotheses || []).map((h) => [h.mfr, h]));
    assert.equal(byMfr._TZ3000_kfu8zapd?.driver, 'button_wireless_4');
    assert.equal(byMfr._TZ3000_kfu8zapd?.pid, 'TS0044');
    assert.equal(byMfr._TZ3000_wkai4ga5?.driver, 'scene_switch_4');
    assert.equal(byMfr._TZ3000_wkai4ga5?.pid, 'TS0044');
  });

  it('compose locks kfu8zapd on button_wireless_4 only', () => {
    const btn = loadCompose('button_wireless_4');
    const scene = loadCompose('scene_switch_4');
    assert.ok(mfrForms(btn, 'kfu8zapd').length >= 2, 'button needs Athom case forms');
    assert.equal(mfrForms(scene, 'kfu8zapd').length, 0, 'scene must not steal kfu8zapd');
    assert.ok((btn.zigbee.productId || []).includes('TS0044'));
  });

  it('compose locks wkai4ga5 on scene_switch_4 only', () => {
    const btn = loadCompose('button_wireless_4');
    const scene = loadCompose('scene_switch_4');
    assert.ok(mfrForms(scene, 'wkai4ga5').length >= 2, 'scene needs Athom case forms');
    assert.equal(mfrForms(btn, 'wkai4ga5').length, 0, 'button must not steal wkai4ga5');
    assert.ok((scene.zigbee.productId || []).includes('TS0044'));
  });

  it('sacred-keep matches compose', () => {
    const keep = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8')
    );
    const list = keep.couples || keep.keep || [];
    const kfu = list.find((c) => /kfu8zapd/i.test(c.mfr) && c.pid === 'TS0044');
    const wkai = list.find((c) => /wkai4ga5/i.test(c.mfr) && c.pid === 'TS0044');
    assert.equal(kfu?.driverId, 'button_wireless_4');
    assert.equal(wkai?.driverId, 'scene_switch_4');
  });
});
