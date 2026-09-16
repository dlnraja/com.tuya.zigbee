'use strict';

/**
 * P2541 — Complementary reinstate Contre quoi.
 * BOTH: restore wiped smart_air_detection_box; append AQ family to air_quality_co2;
 * strip AQ couples from climate only; never unionStrings-shrink dual-case arrays.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const AQ_FAMILY = [
  '_TZE200_yvx5lh6k',
  '_TZE200_8ygsuhe1',
  '_TZE200_ryfmq5rl',
  '_TZE200_c2fmom5z',
  '_TZE200_mja3fuja',
];

function loadCompose(driverId) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8')
  );
}

function hasMfr(compose, mfr) {
  const list = compose?.zigbee?.manufacturerName || [];
  const want = String(mfr).toLowerCase();
  return list.some((m) => String(m).toLowerCase() === want);
}

describe('P2541 complementary reinstate AQ + notions', () => {
  it('SSOT locks reinstate notions (complementary, dual-case, no wipe)', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/complementary-reinstate-notions-ssot.json'), 'utf8')
    );
    assert.equal(ssot.patch, 'P2541');
    assert.equal(ssot.dualApp, 'BOTH');
    assert.equal(ssot.doctrine.complementaryOnly, true);
    assert.equal(ssot.doctrine.noWipeManufacturerName, true);
    assert.equal(ssot.doctrine.noUnionStringsOnDualCaseArrays, true);
    assert.equal(ssot.doctrine.useAppendIdentityStrings, true);
    assert.equal(ssot.doctrine.wrongDriverStripOk, true);
    const ids = ssot.notions.map((n) => n.id);
    for (const id of [
      'complementary-enrich',
      'dual-case-identity',
      'sacred-couple',
      'rx-tx-alternates',
      'zigbee40-suzi',
      'air-quality-family',
    ]) {
      assert.ok(ids.includes(id), `missing notion ${id}`);
    }
  });

  it('ComplementaryMerge exports appendIdentityStrings + degrade guard', () => {
    const M = require(path.join(ROOT, 'lib/enrichment/ComplementaryMerge.js'));
    assert.equal(typeof M.appendIdentityStrings, 'function');
    assert.equal(typeof M.wouldDegradeCompose, 'function');
    // Contre quoi: dual-case must not collapse under append
    const dual = ['_TZE200_yvx5lh6k', '_tze200_yvx5lh6k'];
    const out = M.appendIdentityStrings(dual, ['_TZE204_yvx5lh6k']);
    assert.equal(out.length, 3);
    assert.ok(out.includes('_TZE200_yvx5lh6k'));
    assert.ok(out.includes('_tze200_yvx5lh6k'));
    // Contre quoi: unionStrings collapses dual-case — degrade guard must refuse
    const shrunk = M.unionStrings(dual, ['_TZE204_yvx5lh6k']);
    assert.equal(shrunk.length, 2);
    assert.equal(shrunk.includes('_tze200_yvx5lh6k'), false);
    assert.equal(
      M.wouldDegradeCompose(
        { zigbee: { manufacturerName: dual, productId: ['TS0601'] }, capabilities: ['measure_co2'] },
        { zigbee: { manufacturerName: shrunk, productId: ['TS0601'] }, capabilities: ['measure_co2'] }
      ),
      true
    );
  });

  it('smart_air_detection_box manufacturerName reinstated (not [])', () => {
    const box = loadCompose('smart_air_detection_box');
    const mfrs = box.zigbee?.manufacturerName || [];
    assert.ok(mfrs.length >= 10, `box mfr wiped or too small: ${mfrs.length}`);
    for (const m of AQ_FAMILY) {
      assert.ok(hasMfr(box, m), `box missing ${m}`);
    }
    assert.ok((box.zigbee?.productId || []).includes('TS0601'));
  });

  it('air_quality_co2 keeps AQ family complementary (no shrink below prior tip)', () => {
    const aq = loadCompose('air_quality_co2');
    const mfrs = aq.zigbee?.manufacturerName || [];
    assert.ok(mfrs.length >= 52, `aq shrank below P2538 tip floor: ${mfrs.length}`);
    for (const m of AQ_FAMILY) {
      assert.ok(hasMfr(aq, m), `air_quality_co2 missing ${m}`);
    }
    assert.ok(hasMfr(aq, '_TZE284_8b9zpaav'), 'airbox 8b9zpaav must stay');
  });

  it('climate_sensor must not host AQ sacred couples', () => {
    const climate = loadCompose('climate_sensor');
    for (const m of AQ_FAMILY) {
      assert.equal(hasMfr(climate, m), false, `climate still has ${m}`);
    }
  });

  it('smart_air_detection_box DP21=VOC DP22=HCHO (Z2M, not swapped)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/smart_air_detection_box/device.js'), 'utf8');
    assert.match(src, /tsVOC:\s*21/);
    assert.match(src, /tsFormaldehyde:\s*22/);
    assert.match(src, /P2541|Z2M/);
  });

  it('misattribution registry locks yvx5 family → air_quality_co2', () => {
    const reg = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8')
    );
    const cases = Array.isArray(reg) ? reg : reg.cases || reg.entries || [];
    const hit = cases.find((c) => c.id === 'p2541-tze200-yvx5lh6k-air-quality-reinstate');
    assert.ok(hit, 'registry case missing');
    assert.equal(hit.canonicalDriver, 'air_quality_co2');
    assert.ok((hit.forbiddenDrivers || []).includes('climate_sensor'));
    assert.ok((hit.mfr || []).some((m) => /yvx5lh6k/i.test(m)));
  });
});
